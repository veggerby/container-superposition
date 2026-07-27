import json
import os
import shlex
import shutil
import subprocess
import tempfile
from pathlib import Path

from behave import given, then, when


_BDD_ASSERT_SCRIPT = Path('scripts') / 'bdd-assert.ts'
_BDD_INLINE_FIXTURE_SCRIPT = Path('scripts') / 'bdd-inline-fixture.ts'

@given('a workspace fixture "{fixture_name}"')
def step_given_workspace_fixture(context, fixture_name):
    fixture_path = _find_workspace_fixture(context, fixture_name)

    _create_workspace_dir(context)
    shutil.copytree(fixture_path, context.workspace_dir, dirs_exist_ok=True)


@given('an inline workspace fixture')
def step_given_inline_workspace_fixture(context):
    manifest_text = _require_step_text(context)
    _create_workspace_dir(context)

    bridge_result = _invoke_bridge(
        context,
        _BDD_INLINE_FIXTURE_SCRIPT,
        {
            'workspaceRoot': str(context.workspace_dir),
            'manifestText': manifest_text,
        },
        'Inline workspace fixture bridge produced no result.',
    )

    if not bridge_result.get('ok'):
        raise AssertionError(bridge_result.get('message') or 'Inline workspace fixture failed.')


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


@then('the command exits with status {expected_status:d}')
def step_then_command_exits_with_status(context, expected_status):
    result = _require_command_result(context)
    if result.returncode != expected_status:
        raise AssertionError(
            _command_failure_message(
                result, f'Expected the command to exit with status {expected_status}.'
            )
        )


@then('the command stdout should contain "{expected_text}"')
def step_then_command_stdout_should_contain(context, expected_text):
    result = _require_command_result(context)
    if expected_text not in result.stdout:
        raise AssertionError(
            _command_failure_message(
                result, f'Expected command stdout to contain {expected_text!r}.'
            )
        )


@then('the command stderr should contain "{expected_text}"')
def step_then_command_stderr_should_contain(context, expected_text):
    result = _require_command_result(context)
    if expected_text not in result.stderr:
        raise AssertionError(
            _command_failure_message(
                result, f'Expected command stderr to contain {expected_text!r}.'
            )
        )


@then('the command JSON output should have value at "{selector}" equal')
def step_then_command_json_value_equals(context, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'command-json-value-equals',
            'commandOutputText': _require_command_stdout(context),
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


@then('the command JSON output should contain array item at "{selector}" equal')
def step_then_command_json_array_contains_item(context, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'command-json-array-contains-item',
            'commandOutputText': _require_command_stdout(context),
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


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
    _assert_with_bridge(
        context,
        {
            'kind': 'document-value-equals',
            'fileType': 'json',
            'relativePath': relative_path,
            'selector': property_path,
            'expectedValueText': json.dumps(expected_value),
        },
    )


@then('the JSON file "{relative_path}" should have value at "{selector}" equal')
def step_then_json_value_equals(context, relative_path, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'document-value-equals',
            'fileType': 'json',
            'relativePath': relative_path,
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


@then('the YAML file "{relative_path}" should have value at "{selector}" equal')
def step_then_yaml_value_equals(context, relative_path, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'document-value-equals',
            'fileType': 'yaml',
            'relativePath': relative_path,
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


@then('the JSON file "{relative_path}" should contain array item at "{selector}" equal')
def step_then_json_array_contains_item(context, relative_path, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'document-array-contains-item',
            'fileType': 'json',
            'relativePath': relative_path,
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


@then('the YAML file "{relative_path}" should contain array item at "{selector}" equal')
def step_then_yaml_array_contains_item(context, relative_path, selector):
    _assert_with_bridge(
        context,
        {
            'kind': 'document-array-contains-item',
            'fileType': 'yaml',
            'relativePath': relative_path,
            'selector': selector,
            'expectedValueText': _require_step_text(context),
        },
    )


@then('the Compose file "{relative_path}" should define service "{service}"')
def step_then_compose_defines_service(context, relative_path, service):
    _assert_with_bridge(
        context,
        {'kind': 'compose-service-exists', 'relativePath': relative_path, 'service': service},
    )


@then('the Compose file "{relative_path}" should have service "{service}" environment "{variable}" equal "{expected_value}"')
def step_then_compose_service_environment_equals(
    context, relative_path, service, variable, expected_value
):
    _assert_with_bridge(
        context,
        {
            'kind': 'compose-service-environment-equals',
            'relativePath': relative_path,
            'service': service,
            'variable': variable,
            'expectedValue': expected_value,
        },
    )


@then('the Compose file "{relative_path}" should have service "{service}" port "{port}"')
def step_then_compose_service_has_port(context, relative_path, service, port):
    _assert_with_bridge(
        context,
        {
            'kind': 'compose-service-has-port',
            'relativePath': relative_path,
            'service': service,
            'port': port,
        },
    )


@then('the Compose file "{relative_path}" should have service "{service}" on network "{network}"')
def step_then_compose_service_on_network(context, relative_path, service, network):
    _assert_with_bridge(
        context,
        {
            'kind': 'compose-service-on-network',
            'relativePath': relative_path,
            'service': service,
            'network': network,
        },
    )


@then('the Compose file "{relative_path}" should have network "{network}" named "{expected_name}"')
def step_then_compose_network_named(context, relative_path, network, expected_name):
    _assert_with_bridge(
        context,
        {
            'kind': 'compose-network-named',
            'relativePath': relative_path,
            'network': network,
            'expectedName': expected_name,
        },
    )


@then('the script "{relative_path}" should export "{variable}" equal "{expected_value}"')
def step_then_script_exports_value(context, relative_path, variable, expected_value):
    _assert_with_bridge(
        context,
        {
            'kind': 'script-export-equals',
            'relativePath': relative_path,
            'variable': variable,
            'expectedValue': expected_value,
        },
    )


@then('the script "{relative_path}" should assign "{variable}" equal "{expected_value}"')
def step_then_script_assigns_value(context, relative_path, variable, expected_value):
    _assert_with_bridge(
        context,
        {
            'kind': 'script-assignment-equals',
            'relativePath': relative_path,
            'variable': variable,
            'expectedValue': expected_value,
        },
    )


@then('the script "{relative_path}" should add PATH segment "{segment}" before "{other_segment}"')
def step_then_script_path_segment_before(context, relative_path, segment, other_segment):
    _assert_with_bridge(
        context,
        {
            'kind': 'script-path-segment-before',
            'relativePath': relative_path,
            'segment': segment,
            'otherSegment': other_segment,
        },
    )


@then('the script "{relative_path}" should add PATH segment "{segment}" after "{other_segment}"')
def step_then_script_path_segment_after(context, relative_path, segment, other_segment):
    _assert_with_bridge(
        context,
        {
            'kind': 'script-path-segment-after',
            'relativePath': relative_path,
            'segment': segment,
            'otherSegment': other_segment,
        },
    )


@then('the script "{relative_path}" should include PATH segment "{segment}"')
def step_then_script_path_includes_segment(context, relative_path, segment):
    _assert_with_bridge(
        context,
        {
            'kind': 'script-path-includes-segment',
            'relativePath': relative_path,
            'segment': segment,
        },
    )


def _assert_with_bridge(context, assertion):
    bridge_result = _invoke_bridge(
        context,
        _BDD_ASSERT_SCRIPT,
        {
            **assertion,
            'workspaceRoot': str(context.workspace_dir),
        },
        'BDD assertion bridge produced no result.',
    )
    if not bridge_result.get('ok'):
        raise AssertionError(bridge_result.get('message') or 'BDD assertion failed.')



def _require_step_text(context):
    text = (context.text or '').strip()
    if not text:
        raise AssertionError('Expected a step doc string with the structured value to compare.')
    return text



def _create_workspace_dir(context):
    context.workspace_parent = Path(tempfile.mkdtemp(prefix='cs-behave-'))
    context.workspace_dir = context.workspace_parent / 'workspace'
    context.workspace_dir.mkdir(parents=True, exist_ok=True)



def _invoke_bridge(context, script_path, payload, empty_result_message):
    command = [
        context.node_binary,
        str(context.repo_root / 'node_modules' / 'tsx' / 'dist' / 'cli.mjs'),
        str(context.repo_root / script_path),
    ]
    result = subprocess.run(
        command,
        cwd=context.repo_root,
        capture_output=True,
        text=True,
        input=json.dumps(payload),
        env={**os.environ, 'FORCE_COLOR': '0'},
    )

    if not result.stdout.strip():
        raise AssertionError(_command_failure_message(result, empty_result_message))

    return json.loads(result.stdout.strip())



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


def _require_command_stdout(context):
    result = _require_command_result(context)
    stdout = result.stdout.strip()
    if not stdout:
        raise AssertionError(_command_failure_message(result, 'Expected command stdout to contain JSON output.'))
    return stdout


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
