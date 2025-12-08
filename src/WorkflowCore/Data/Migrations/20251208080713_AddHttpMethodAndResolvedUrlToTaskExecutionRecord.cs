using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowCore.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHttpMethodAndResolvedUrlToTaskExecutionRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HttpMethod",
                table: "TaskExecutionRecords",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolvedUrl",
                table: "TaskExecutionRecords",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "error_quality_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    execution_id = table.Column<Guid>(type: "uuid", nullable: false),
                    task_execution_id = table.Column<Guid>(type: "uuid", nullable: true),
                    task_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    task_ref = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    workflow_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    stars = table.Column<int>(type: "integer", nullable: false),
                    criteria_met = table.Column<int>(type: "integer", nullable: false),
                    criteria_missing = table.Column<int>(type: "integer", nullable: false),
                    http_status_code = table.Column<int>(type: "integer", nullable: true),
                    error_body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    improvement_tips = table.Column<string>(type: "text", nullable: true),
                    criteria_breakdown = table.Column<string>(type: "text", nullable: true),
                    analyzed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_error_quality_records", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "LabelUsageStats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LabelType = table.Column<string>(type: "text", nullable: false),
                    LabelValue = table.Column<string>(type: "text", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    UsageCount = table.Column<int>(type: "integer", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabelUsageStats", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaskLabels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskName = table.Column<string>(type: "text", nullable: false),
                    Namespace = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: true),
                    Tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VersionHash = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskLabels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowLabels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkflowName = table.Column<string>(type: "text", nullable: false),
                    Namespace = table.Column<string>(type: "text", nullable: false),
                    Tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    Categories = table.Column<List<string>>(type: "text[]", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VersionHash = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowLabels", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_LabelUsageStats",
                table: "LabelUsageStats",
                columns: new[] { "LabelType", "LabelValue", "EntityType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_TaskLabels_Name_Namespace",
                table: "TaskLabels",
                columns: new[] { "TaskName", "Namespace" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_WorkflowLabels_Name_Namespace",
                table: "WorkflowLabels",
                columns: new[] { "WorkflowName", "Namespace" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "error_quality_records");

            migrationBuilder.DropTable(
                name: "LabelUsageStats");

            migrationBuilder.DropTable(
                name: "TaskLabels");

            migrationBuilder.DropTable(
                name: "WorkflowLabels");

            migrationBuilder.DropColumn(
                name: "HttpMethod",
                table: "TaskExecutionRecords");

            migrationBuilder.DropColumn(
                name: "ResolvedUrl",
                table: "TaskExecutionRecords");
        }
    }
}
