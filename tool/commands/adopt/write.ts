import * as fs from 'fs';
import yaml from 'js-yaml';
import { writeProjectConfig } from '../../schema/project-config.js';
import type { AdoptWriteArtifactsInput } from './types.js';
import { withSchemaFirst } from './synthesis.js';

export function writeAdoptArtifacts(input: AdoptWriteArtifactsInput): void {
    fs.writeFileSync(input.manifestPath, JSON.stringify(input.manifest, null, 2) + '\n', 'utf8');
    writeProjectConfig(input.projectFilePath, input.projectSelection);

    if (input.customDevcontainerPatch || input.customComposePatch) {
        fs.mkdirSync(input.customDir, { recursive: true });
    }

    if (input.customDevcontainerPatch) {
        fs.writeFileSync(
            input.customPatchPath,
            JSON.stringify(withSchemaFirst(input.customDevcontainerPatch), null, 4) + '\n',
            'utf8'
        );
    }

    if (input.customComposePatch) {
        const headerText =
            '# Custom Docker Compose services preserved from original configuration.\n' +
            '# These services have no equivalent overlay and will be merged into\n' +
            '# docker-compose.yml during regeneration.\n';
        fs.writeFileSync(
            input.customComposePath,
            headerText + (yaml.dump(input.customComposePatch) as string),
            'utf8'
        );
    }
}
