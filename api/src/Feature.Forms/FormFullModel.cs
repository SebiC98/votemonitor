﻿using Vote.Monitor.Form.Module.Mappers;
using Vote.Monitor.Form.Module.Models;

namespace Feature.Forms;

public class FormFullModel: FormSlimModel
{
    public static FormFullModel FromEntity(FormAggregate form) => form == null ? null : new FormFullModel
    {
        Id = form.Id,
        Code = form.Code,
        FormType = form.FormType,
        Status = form.Status,
        DefaultLanguage = form.DefaultLanguage,
        Languages = form.Languages,
        Name = form.Name,
        Questions = form.Questions.Select(QuestionsMapper.ToModel).ToList(),
        NumberOfQuestions = form.NumberOfQuestions,
        CreatedOn = form.CreatedOn,
        LastModifiedOn = form.LastModifiedOn,
        Description = form.Description,
        LanguagesTranslationStatus = form.LanguagesTranslationStatus
    };

    public IReadOnlyList<BaseQuestionModel> Questions { get; init; } = [];
}
