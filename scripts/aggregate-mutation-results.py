#!/usr/bin/env python3
"""
Mutation Testing Results Aggregator

Aggregates mutation testing results from backend (Stryker.NET) projects
and generates a comprehensive summary report.

Usage:
    python3 scripts/aggregate-mutation-results.py
"""

import json
import os
from pathlib import Path
from datetime import datetime

def find_latest_report(project_name):
    """Find the most recent mutation report for a project."""
    base_dir = Path(f"stryker-output/{project_name}")

    if not base_dir.exists():
        return None

    # Get all timestamp directories
    timestamp_dirs = [d for d in base_dir.iterdir() if d.is_dir()]

    if not timestamp_dirs:
        return None

    # Sort by name (timestamp format: YYYYMMDD-HHMMSS)
    latest_dir = sorted(timestamp_dirs, reverse=True)[0]

    report_path = latest_dir / "reports" / "mutation-report.json"

    if report_path.exists():
        return report_path

    return None

def parse_mutation_report(report_path):
    """Parse a mutation testing JSON report."""
    with open(report_path, 'r') as f:
        data = json.load(f)

    # Extract metrics
    metrics = {
        'mutation_score': data.get('projectRoot', {}).get('mutationScore', 0),
        'killed': 0,
        'survived': 0,
        'timeout': 0,
        'no_coverage': 0,
        'compile_error': 0,
        'total': 0,
        'files': {}
    }

    # Count mutants by file
    for file_path, file_data in data.get('files', {}).items():
        if 'mutants' not in file_data:
            continue

        file_metrics = {
            'killed': 0,
            'survived': 0,
            'timeout': 0,
            'no_coverage': 0,
            'compile_error': 0,
            'total': 0
        }

        for mutant in file_data['mutants']:
            status = mutant.get('status', 'Unknown')
            file_metrics['total'] += 1
            metrics['total'] += 1

            status_key = status.lower().replace(' ', '_')
            if status_key in file_metrics:
                file_metrics[status_key] += 1
                metrics[status_key] += 1

        # Calculate file mutation score
        tested = file_metrics['total'] - file_metrics['no_coverage']
        if tested > 0:
            file_metrics['mutation_score'] = (file_metrics['killed'] / tested) * 100
        else:
            file_metrics['mutation_score'] = 0

        # Extract relative path
        relative_path = file_path.split('/src/')[-1] if '/src/' in file_path else file_path
        metrics['files'][relative_path] = file_metrics

    return metrics

def generate_summary_report(results):
    """Generate a markdown summary report."""
    report_lines = [
        "# Backend Mutation Testing Summary Report",
        "",
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "---",
        "",
        "## Overall Results",
        "",
        "| Project | Mutation Score | Killed | Survived | Timeout | No Coverage | Compile Error | Total |",
        "|---------|----------------|--------|----------|---------|-------------|---------------|-------|",
    ]

    total_killed = 0
    total_survived = 0
    total_timeout = 0
    total_no_coverage = 0
    total_compile_error = 0
    total_mutants = 0

    for project, metrics in results.items():
        if metrics is None:
            report_lines.append(f"| {project} | N/A | - | - | - | - | - | - |")
            continue

        total_killed += metrics['killed']
        total_survived += metrics['survived']
        total_timeout += metrics['timeout']
        total_no_coverage += metrics['no_coverage']
        total_compile_error += metrics['compile_error']
        total_mutants += metrics['total']

        report_lines.append(
            f"| {project} | {metrics['mutation_score']:.2f}% | "
            f"{metrics['killed']} | {metrics['survived']} | {metrics['timeout']} | "
            f"{metrics['no_coverage']} | {metrics['compile_error']} | {metrics['total']} |"
        )

    # Calculate overall score
    tested = total_mutants - total_no_coverage
    overall_score = (total_killed / tested * 100) if tested > 0 else 0

    report_lines.extend([
        f"| **TOTAL** | **{overall_score:.2f}%** | "
        f"**{total_killed}** | **{total_survived}** | **{total_timeout}** | "
        f"**{total_no_coverage}** | **{total_compile_error}** | **{total_mutants}** |",
        "",
        "---",
        "",
    ])

    # Add per-file breakdown for each project
    for project, metrics in results.items():
        if metrics is None or not metrics['files']:
            continue

        report_lines.extend([
            f"## {project} - File Breakdown",
            "",
            "| File | Mutation Score | Killed | Survived | No Coverage | Total |",
            "|------|----------------|--------|----------|-------------|-------|",
        ])

        # Sort files by mutation score (ascending - worst first)
        sorted_files = sorted(
            metrics['files'].items(),
            key=lambda x: x[1]['mutation_score']
        )

        for file_path, file_metrics in sorted_files:
            report_lines.append(
                f"| {file_path} | {file_metrics['mutation_score']:.2f}% | "
                f"{file_metrics['killed']} | {file_metrics['survived']} | "
                f"{file_metrics['no_coverage']} | {file_metrics['total']} |"
            )

        report_lines.extend(["", "---", ""])

    return "\n".join(report_lines)

def main():
    """Main execution function."""
    print("Backend Mutation Testing Results Aggregator")
    print("=" * 80)

    projects = ['workflowoperator', 'workflowcore', 'workflowgateway']
    results = {}

    for project in projects:
        print(f"\nSearching for {project} mutation report...")
        report_path = find_latest_report(project)

        if report_path is None:
            print(f"  ❌ No report found for {project}")
            results[project] = None
            continue

        print(f"  ✅ Found report: {report_path}")

        try:
            metrics = parse_mutation_report(report_path)
            results[project] = metrics
            print(f"  📊 Mutation Score: {metrics['mutation_score']:.2f}%")
            print(f"  📈 Killed: {metrics['killed']}, Survived: {metrics['survived']}, Total: {metrics['total']}")
        except Exception as e:
            print(f"  ❌ Error parsing report: {e}")
            results[project] = None

    print("\n" + "=" * 80)
    print("Generating summary report...")

    summary_report = generate_summary_report(results)

    output_path = Path("mutation-testing-backend-summary.md")
    with open(output_path, 'w') as f:
        f.write(summary_report)

    print(f"✅ Summary report generated: {output_path}")
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    for project, metrics in results.items():
        if metrics:
            print(f"{project}: {metrics['mutation_score']:.2f}% ({metrics['killed']}/{metrics['total']} mutants)")
        else:
            print(f"{project}: No data available")

if __name__ == '__main__':
    main()
