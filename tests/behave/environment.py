import os
import shutil
from pathlib import Path


def before_all(context):
    context.repo_root = Path(os.environ["CS_BDD_REPO_ROOT"]).resolve()
    context.node_binary = os.environ["CS_BDD_NODE_BINARY"]
    context.stage_features_root = Path(os.environ["CS_BDD_STAGE_FEATURES_ROOT"]).resolve()
    context.shared_fixtures_root = context.stage_features_root / "tests" / "behave" / "fixtures"


def before_scenario(context, scenario):
    context.command_result = None
    context.workspace_dir = None
    context.workspace_parent = None
    context.feature_support_root = _feature_support_root(context, scenario)


def after_scenario(context, scenario):
    if context.workspace_parent is not None:
        shutil.rmtree(context.workspace_parent, ignore_errors=True)


def _feature_support_root(context, scenario):
    feature_path = Path(scenario.feature.filename).resolve()
    relative_feature_path = feature_path.relative_to(context.stage_features_root)
    parts = relative_feature_path.parts

    if parts[:3] == ("tests", "behave", "features"):
        return context.stage_features_root / "tests" / "behave"

    if len(parts) >= 4 and parts[0] == "overlays" and parts[2:4] == ("tests", "behave"):
        return context.stage_features_root / "overlays" / parts[1] / "tests" / "behave"

    raise AssertionError(
        f"Unsupported staged feature location: {relative_feature_path}"
    )

