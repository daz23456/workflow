using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowCore.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDurationTrendsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExecutionRecords_StartedAt",
                table: "ExecutionRecords");

            migrationBuilder.DropIndex(
                name: "IX_ExecutionRecords_WorkflowName",
                table: "ExecutionRecords");

            migrationBuilder.CreateIndex(
                name: "IX_TaskExecutionRecords_TaskRef_StartedAt_Status",
                table: "TaskExecutionRecords",
                columns: new[] { "TaskRef", "StartedAt", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionRecords_WorkflowName_StartedAt_Status",
                table: "ExecutionRecords",
                columns: new[] { "WorkflowName", "StartedAt", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskExecutionRecords_TaskRef_StartedAt_Status",
                table: "TaskExecutionRecords");

            migrationBuilder.DropIndex(
                name: "IX_ExecutionRecords_WorkflowName_StartedAt_Status",
                table: "ExecutionRecords");

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionRecords_StartedAt",
                table: "ExecutionRecords",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionRecords_WorkflowName",
                table: "ExecutionRecords",
                column: "WorkflowName");
        }
    }
}
