package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_thumbnails")
public class CourseThumbnail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "storage_id", nullable = false, unique = true)
    private String storageId;

    @Column(name = "workdrive_file_id", length = 128)
    private String workdriveFileId;

    @Column(nullable = false)
    private String filename;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "data")
    private byte[] data;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public CourseThumbnail() {}

    public CourseThumbnail(Long courseId, String storageId, String filename, String contentType, Long fileSize, byte[] data) {
        this(courseId, storageId, null, filename, contentType, fileSize, data);
    }

    public CourseThumbnail(Long courseId, String storageId, String workdriveFileId, String filename, String contentType, Long fileSize, byte[] data) {
        this.courseId = courseId;
        this.storageId = storageId;
        this.workdriveFileId = workdriveFileId;
        this.filename = filename;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.data = data;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getStorageId() { return storageId; }
    public void setStorageId(String storageId) { this.storageId = storageId; }

    public String getWorkdriveFileId() { return workdriveFileId; }
    public void setWorkdriveFileId(String workdriveFileId) { this.workdriveFileId = workdriveFileId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

