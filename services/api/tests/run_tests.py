#!/usr/bin/env python
"""
Test Runner Script for NextHaven.ai API

This script runs the test suite with different options for coverage and reporting.
It provides a simple interface to run different types of tests and generate coverage reports.

Usage:
    python tests/run_tests.py [options]

Options:
    --unit           Run only unit tests
    --integration    Run only integration tests
    --api            Run only API tests
    --all            Run all tests (default)
    --parallel       Run tests in parallel
    --xml            Generate XML coverage report
    --html           Generate HTML coverage report
    --report         Print coverage report to console
    --verbose        Run with verbose output
    --quiet          Minimal test output
    --failfast       Stop on first failure
    --snapshot-update Update snapshot tests

Example:
    python tests/run_tests.py --unit --html
    python tests/run_tests.py --all --parallel --xml --html
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
import platform


def main():
    """Main entry point for the test runner script."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run the test suite with coverage options")
    
    # Test selection options
    test_group = parser.add_argument_group("Test Selection")
    test_group.add_argument("--unit", action="store_true", help="Run only unit tests")
    test_group.add_argument("--integration", action="store_true", help="Run only integration tests")
    test_group.add_argument("--api", action="store_true", help="Run only API tests")
    test_group.add_argument("--all", action="store_true", help="Run all tests (default)")
    
    # Coverage and reporting options
    report_group = parser.add_argument_group("Coverage and Reporting")
    report_group.add_argument("--xml", action="store_true", help="Generate XML coverage report")
    report_group.add_argument("--html", action="store_true", help="Generate HTML coverage report")
    report_group.add_argument("--report", action="store_true", help="Print coverage report to console")
    
    # Execution options
    exec_group = parser.add_argument_group("Execution Options")
    exec_group.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    exec_group.add_argument("--verbose", action="store_true", help="Run with verbose output")
    exec_group.add_argument("--quiet", action="store_true", help="Minimal test output")
    exec_group.add_argument("--failfast", action="store_true", help="Stop on first failure")
    
    # Special options
    special_group = parser.add_argument_group("Special Options")
    special_group.add_argument("--snapshot-update", action="store_true", help="Update snapshot tests")
    
    args = parser.parse_args()
    
    # Default to running all tests if no test type specified
    if not (args.unit or args.integration or args.api):
        args.all = True
    
    # Construct the pytest command - use poetry run on all platforms
    # This ensures the correct Python environment is used
    cmd = ["poetry", "run", "pytest"]
    
    # Test selection
    if args.unit:
        cmd.append("-m")
        cmd.append("unit")
    elif args.integration:
        cmd.append("-m")
        cmd.append("integration")
    elif args.api:
        cmd.append("-m")
        cmd.append("api")
    
    # Coverage options
    cmd.append("--cov=src")
    
    if args.xml:
        cmd.append("--cov-report=xml")
    
    if args.html:
        cmd.append("--cov-report=html")
    
    if args.report or (not args.xml and not args.html):
        cmd.append("--cov-report=term")
    
    # Execution options
    if args.parallel:
        cmd.append("-n")
        cmd.append("auto")
    
    if args.verbose:
        cmd.append("-v")
    
    if args.quiet:
        cmd.append("-q")
    
    if args.failfast:
        cmd.append("-x")
    
    # Special options
    if args.snapshot_update:
        cmd.append("--snapshot-update")
    
    # Print the command being executed
    print("\n" + "=" * 80)
    print("Executing: " + " ".join(cmd))
    print("=" * 80 + "\n")
    
    # Change to the project root directory if needed
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Run the tests
    result = subprocess.run(cmd)
    
    # Exit with the pytest return code
    sys.exit(result.returncode)


if __name__ == "__main__":
    main() 