﻿using Authorization.Policies;
using Dapper;
using Feature.Form.Submissions.Models;
using Microsoft.EntityFrameworkCore;
using Vote.Monitor.Answer.Module.Aggregators;
using Vote.Monitor.Core.Services.FileStorage.Contracts;
using Vote.Monitor.Domain;
using Vote.Monitor.Domain.ConnectionFactory;

namespace Feature.Form.Submissions.GetAggregated;

public class Endpoint(VoteMonitorContext context,
    INpgsqlConnectionFactory connectionFactory,
    IFileStorageService fileStorageService) : Endpoint<Request, Results<Ok<Response>, NotFound>>
{
    public override void Configure()
    {
        Get("/api/election-rounds/{electionRoundId}/form-submissions/{formId}:aggregated");
        DontAutoTag();
        Options(x => x.WithTags("form-submissions", "mobile"));
        Policies(PolicyNames.NgoAdminsOnly);
        Summary(s =>
        {
            s.Summary = "Gets aggregated form with all the notes and attachments";
        });
    }

    public override async Task<Results<Ok<Response>, NotFound>> ExecuteAsync(Request req, CancellationToken ct)
    {
        var form = await context
            .Forms
            .Where(x => x.ElectionRoundId == req.ElectionRoundId
                        && x.MonitoringNgo.NgoId == req.NgoId
                        && x.Id == req.FormId)
            .FirstOrDefaultAsync(ct);

        if (form is null)
        {
            return TypedResults.NotFound();
        }

        var submissions = await context.FormSubmissions
            .Include(x => x.MonitoringObserver)
            .ThenInclude(x => x.Observer)
            .ThenInclude(x => x.ApplicationUser)
            .Where(x => x.ElectionRoundId == req.ElectionRoundId
                        && x.MonitoringObserver.MonitoringNgo.NgoId == req.NgoId
                        && x.FormId == req.FormId)
            .ToListAsync(ct);

        var formSubmissionsAggregate = new FormSubmissionsAggregate(form);
        foreach (var formSubmission in submissions)
        {
            formSubmissionsAggregate.AggregateAnswers(formSubmission);
        }

        var sql = """
                SELECT
                    N."Id",
                    N."MonitoringObserverId",
                    N."QuestionId",
                    N."Text",
                    COALESCE(N."LastModifiedOn", N."CreatedOn") "TimeSubmitted",
                    (
                        SELECT
                            FS."Id"
                        FROM
                            "FormSubmissions" FS
                        WHERE
                            FS."MonitoringObserverId" = N."MonitoringObserverId"
                            AND FS."FormId" = N."FormId"
                            AND FS."PollingStationId" = N."PollingStationId"
                            AND FS."ElectionRoundId" = N."ElectionRoundId"
                    ) "SubmissionId"
                FROM
                    "Notes" N
                WHERE
                    N."ElectionRoundId" = @electionRoundId
                    AND N."FormId" = @formId;

                SELECT
                    A."MonitoringObserverId",
                    A."QuestionId",
                    A."FileName",
                    A."MimeType",
                    A."FilePath",
                    A."UploadedFileName",
                    COALESCE(A."LastModifiedOn", A."CreatedOn") "TimeSubmitted",
                    (
                        SELECT
                            FS."Id"
                        FROM
                            "FormSubmissions" FS
                        WHERE
                            FS."MonitoringObserverId" = A."MonitoringObserverId"
                            AND FS."FormId" = A."FormId"
                            AND FS."PollingStationId" = A."PollingStationId"
                            AND FS."ElectionRoundId" = A."ElectionRoundId"
                    ) "SubmissionId"
                FROM
                    "Attachments" A
                WHERE
                    A."ElectionRoundId" = @electionRoundId
                    AND A."IsDeleted" = false AND A."IsCompleted" = true
                    AND A."FormId" = @formId;
                """;

        var queryArgs = new
        {
            electionRoundId = req.ElectionRoundId,
            formId = req.FormId
        };

        List<NoteModel> notes = [];
        List<AttachmentModel> attachments = [];

        using (var dbConnection = await connectionFactory.GetOpenConnectionAsync(ct))
        {
            using var multi = await dbConnection.QueryMultipleAsync(sql, queryArgs);
            notes = multi.Read<NoteModel>().ToList();
            attachments = multi.Read<AttachmentModel>().ToList();
        }

        foreach (var attachment in attachments)
        {
            var result = await fileStorageService.GetPresignedUrlAsync(attachment.FilePath, attachment.UploadedFileName);
            if (result is GetPresignedUrlResult.Ok(var url, _, var urlValidityInSeconds))
            {
                attachment.PresignedUrl = url;
                attachment.UrlValidityInSeconds = urlValidityInSeconds;
            }
        }

        return TypedResults.Ok(new Response
        {
            SubmissionsAggregate = formSubmissionsAggregate,
            Notes = notes,
            Attachments = attachments
        });
    }
}
