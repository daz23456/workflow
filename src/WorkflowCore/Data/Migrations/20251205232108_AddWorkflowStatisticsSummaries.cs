using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowCore.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowStatisticsSummaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaskStatisticsSummaries",
                columns: table => new
                {
                    TaskRef = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    TotalExecutions = table.Column<int>(type: "integer", nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    FailureCount = table.Column<int>(type: "integer", nullable: false),
                    AverageDurationMs = table.Column<long>(type: "bigint", nullable: false),
                    TotalDurationMs = table.Column<long>(type: "bigint", nullable: false),
                    SuccessRate = table.Column<double>(type: "double precision", nullable: false),
                    LastExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskStatisticsSummaries", x => x.TaskRef);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowStatisticsSummaries",
                columns: table => new
                {
                    WorkflowName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    TotalExecutions = table.Column<int>(type: "integer", nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    FailureCount = table.Column<int>(type: "integer", nullable: false),
                    AverageDurationMs = table.Column<long>(type: "bigint", nullable: false),
                    TotalDurationMs = table.Column<long>(type: "bigint", nullable: false),
                    SuccessRate = table.Column<double>(type: "double precision", nullable: false),
                    LastExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowStatisticsSummaries", x => x.WorkflowName);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskStatisticsSummaries");

            migrationBuilder.DropTable(
                name: "WorkflowStatisticsSummaries");
        }
    }
}
