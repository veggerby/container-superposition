import json
import os
import shlex
import shutil
import subprocess
import tempfile
from pathlib import Path

from behave import given, then, when


@given('a workspace fixture "{fixture_name}"')
def step_given_workspace_fixture(context, fixture_name):
    fixture_path = _find_workspace_fixture(context, fixture_name)

    context.workspace_parent = Path(tempfile.mkdtemp(prefix='cs-behave-'))
    context.workspace_dir = context.workspace_parent / 'workspace'
    shutil.copytree(fixture_path, context.workspace_dir)


@when('I run the CLI command')
def step_when_i_run_the_cli_command(context):
    if context.workspace_dir is None:
        raise AssertionError('A workspace fixture must be prepared before running the CLI command.')

    command_text = (context.text or '').strip()
    if not command_text:
        raise AssertionError('Expected a CLI command body.')

    command = [
        context.node_binary,
        str(context.repo_root / 'node_modules' / 'tsx' / 'dist' / 'cli.mjs'),
        str(context.repo_root / 'scripts' / 'init.ts'),
        *shlex.split(command_text),
    ]
    context.command_result = subprocess.run(
        command,
        cwd=context.workspace_dir,
        capture_output=True,
        text=True,
        env={**os.environ, 'FORCE_COLOR': '0'},
    )


@then('the command exits successfully')
def step_then_command_exits_successfully(context):
    result = _require_command_result(context)
    if result.returncode != 0:
        raise AssertionError(_command_failure_message(result, 'Expected the command to succeed.'))


@then('the file "{relative_path}" should exist')
def step_then_file_should_exist(context, relative_path):
    file_path = _workspace_path(context, relative_path)
    if not file_path.exists():
        raise AssertionError(f'Expected file to exist: {relative_path}')


@then('the file "{relative_path}" should contain "{expected_text}"')
def step_then_file_should_contain(context, relative_path, expected_text):
    file_path = _workspace_path(context, relative_path)
    actual_text = file_path.read_text(encoding='utf-8')
    if expected_text not in actual_text:
        raise AssertionError(
            f'Expected file {relative_path} to contain {expected_text!r}.\nActual content:\n{actual_text}'
        )


@then('the JSON file "{relative_path}" should have property "{property_path}" equal "{expected_value}"')
def step_then_json_property_equals(context, relative_path, property_path, expected_value):
    file_path = _workspace_path(context, relative_path)
    document = json.loads(file_path.read_text(encoding='utf-8'))
    actual_value = document

    for key in property_path.split('.'):
        if not isinstance(actual_value, dict) or key not in actual_value:
            raise AssertionError(
                f'Missing property {property_path!r} in JSON file {relative_path}. Current value: {actual_value!r}'
            )
        actual_value = actual_value[key]

    if str(actual_value) != expected_value:
        raise AssertionError(
            f'Expected {property_path!r} in {relative_path} to equal {expected_value!r}, got {actual_value!r}'
        )


def _find_workspace_fixture(context, fixture_name):
    candidate_roots = []

    feature_fixtures_root = context.feature_support_root / 'fixtures'
    if feature_fixtures_root.is_dir():
        candidate_roots.append(feature_fixtures_root)

    if (
        context.shared_fixtures_root.is_dir()
        and context.shared_fixtures_root not in candidate_roots
    ):
        candidate_roots.append(context.shared_fixtures_root)

    for candidate_root in candidate_roots:
        fixture_path = candidate_root / fixture_name
        if fixture_path.is_dir():
            return fixture_path

    searched_roots = ', '.join(str(root) for root in candidate_roots) or '<none>'
    raise AssertionError(
        f'Missing workspace fixture: {fixture_name}. Searched: {searched_roots}'
    )


def _workspace_path(context, relative_path):
    if context.workspace_dir is None:
        raise AssertionError('No workspace fixture is active for this scenario.')
    return Path(context.workspace_dir) / relative_path


def _require_command_result(context):
    if context.command_result is None:
        raise AssertionError('No CLI command has been executed yet.')
    return context.command_result


def _command_failure_message(result, message):
    stdout = result.stdout.strip()
    stderr = result.stderr.strip()
    return '\n'.join(
        [
            message,
            f'Exit code: {result.returncode}',
            f'STDOUT:\n{stdout or "<empty>"}',
            f'STDERR:\n{stderr or "<empty>"}',
        ]
    )
