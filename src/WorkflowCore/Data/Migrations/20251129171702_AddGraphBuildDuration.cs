using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowCore.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGraphBuildDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "GraphBuildDuration",
                table: "ExecutionRecords",
                type: "interval",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GraphBuildDuration",
                table: "ExecutionRecords");
        }
    }
}
