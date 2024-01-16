﻿namespace Vote.Monitor.Api.Feature.CSOAdmin.List;

public class Request : BaseSortPaginatedRequest
{
    [QueryParam]
    public string? NameFilter { get; set; }

    [QueryParam]
    [JsonConverter(typeof(SmartEnumNameConverter<UserStatus, string>))]
    public UserStatus? Status { get; set; }
}
