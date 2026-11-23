package com.fairmacs.lms.dto;

public record PolicyExcelExportResult(
        byte[] excelBytes,
        String filename
) {}
