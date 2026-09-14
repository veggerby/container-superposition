# HermIT Ontology Reasoner Overlay

Adds the [HermIT OWL reasoner](http://www.hermit-reasoner.com/) command-line interface to the devcontainer for ontology consistency checks, classification, and related OWL 2 DL reasoning workflows.

## What it installs

- Requires the [`java`](../java/README.md) overlay, which supplies Eclipse Temurin JDK 21 and Maven.
- Resolves `net.sourceforge.owlapi:org.semanticweb.hermit:${HERMIT_VERSION}` from Maven Central during `postCreateCommand`.
- Defaults `HERMIT_VERSION` to `1.4.5.519`.
- Installs the artifact plus Maven runtime dependencies under `/usr/local/share/hermit/${HERMIT_VERSION}/lib`.
- Installs `/usr/local/bin/hermit`, a launcher for `org.semanticweb.HermiT.cli.CommandLine` using that versioned classpath.

The Maven coordinate is reproducible and fetched over HTTPS; the overlay does not vendor HermIT artifacts. Upstream metadata identifies HermIT as LGPL-3.0 licensed. See the [Maven Central artifact](https://repo1.maven.org/maven2/net/sourceforge/owlapi/org.semanticweb.hermit/1.4.5.519/) and [upstream HermIT pages](http://www.cs.ox.ac.uk/isg/tools/HermiT/) for source, license, and distribution information.

## Usage

Place ontology files in your workspace, rebuild or create the devcontainer, then run HermIT from the terminal:

```bash
hermit --version
hermit --help
hermit --consistency file:/workspaces/my-project/ontology.owl
hermit --classify file:/workspaces/my-project/ontology.owl
```

For large ontologies, pass JVM tuning through standard Java environment variables before invoking the launcher, for example:

```bash
JAVA_TOOL_OPTIONS='-Xmx4g' hermit --consistency file:/workspaces/my-project/ontology.owl
```

HermIT reads ontology inputs for reasoning; it is not a repository database or background service.

## Related overlays

- [`java`](../java/README.md) is required and supplies the JDK/Maven runtime used by HermIT.
- [`fuseki`](../fuseki/README.md) is complementary when you need an Apache Jena Fuseki triplestore, local SPARQL endpoint, or RDF seed-loading workflow.

HermIT complements Fuseki rather than replacing it: Fuseki stores and queries RDF graphs over SPARQL, while HermIT performs OWL reasoning and consistency/classification checks against ontology files or ontology IRIs. Select `fuseki` explicitly only when you also need the triplestore service.

## Configuration

Override the HermIT version in `superposition.yml` when needed:

```yaml
stack: plain
overlays:
    - hermit
parameters:
    HERMIT_VERSION: 1.4.5.519
```

The overlay has no Docker Compose service, exposed port, or long-running process.
