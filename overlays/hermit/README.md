# HermIT Ontology Reasoner Overlay

Adds the [HermIT OWL reasoner](http://www.hermit-reasoner.com/) command-line interface to the devcontainer for ontology consistency checks, classification, and related OWL 2 DL reasoning workflows.

## Features

- **Java + Maven dependency** - Requires the [`java`](../java/README.md) overlay, which supplies Eclipse Temurin JDK 21 and Maven
- **Pinned Maven artifact** - Resolves `net.sourceforge.owlapi:org.semanticweb.hermit:${HERMIT_VERSION}` from Maven Central during `postCreateCommand`
- **Versioned installation** - Defaults `HERMIT_VERSION` to `1.4.5.519` and installs the artifact plus runtime dependencies under `/usr/local/share/hermit/${HERMIT_VERSION}/lib`
- **HermIT launcher** - Installs `/usr/local/bin/hermit` as a wrapper around `org.semanticweb.HermiT.cli.CommandLine`

## How It Works

During `postCreateCommand`, the overlay resolves the configured HermIT artifact from Maven Central and copies the resulting runtime JARs into a versioned installation directory inside the devcontainer.

**Installation flow:**

- validates `HERMIT_VERSION` before running privileged install steps
- resolves the pinned Maven coordinate over HTTPS
- writes a `hermit` launcher that runs `org.semanticweb.HermiT.cli.CommandLine` with the selected versioned classpath
- verifies the launcher with `hermit --help` on install and on every container start

The Maven coordinate is reproducible and fetched over HTTPS; the overlay does not vendor HermIT artifacts. Upstream metadata identifies HermIT as LGPL-3.0 licensed. See the [Maven Central artifact](https://repo1.maven.org/maven2/net/sourceforge/owlapi/org.semanticweb.hermit/1.4.5.519/) and [upstream HermIT pages](http://www.cs.ox.ac.uk/isg/tools/HermiT/) for source, license, and distribution information.

## Common Commands

### Reasoning help and validation

Place ontology files in your workspace, rebuild or create the devcontainer, then run HermIT from the terminal:

```bash
hermit --help
hermit --consistency file:/workspaces/my-project/ontology.owl
hermit --classify file:/workspaces/my-project/ontology.owl
```

### JVM tuning

For large ontologies, pass JVM tuning through standard Java environment variables before invoking the launcher, for example:

```bash
JAVA_TOOL_OPTIONS='-Xmx4g' hermit --consistency file:/workspaces/my-project/ontology.owl
```

HermIT reads ontology inputs for reasoning; it is not a repository database or background service.

## Use Cases

- **Ontology consistency checks** - Validate OWL 2 DL ontologies during development
- **Classification workflows** - Compute inferred class hierarchies from ontology files
- **Semantic-web projects** - Pair local ontology reasoning with RDF and SPARQL tooling

HermIT complements Fuseki rather than replacing it: Fuseki stores and queries RDF graphs over SPARQL, while HermIT performs OWL reasoning and consistency/classification checks against ontology files or ontology IRIs. Select `fuseki` explicitly only when you also need the triplestore service.

**Integrates well with:**

- [`java`](../java/README.md) for the required JDK and Maven runtime
- [`fuseki`](../fuseki/README.md) when you also need a local Apache Jena Fuseki triplestore or SPARQL endpoint

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

## References

- [HermIT reasoner homepage](http://www.hermit-reasoner.com/)
- [University of Oxford HermIT project page](http://www.cs.ox.ac.uk/isg/tools/HermiT/)
- [Maven Central: net.sourceforge.owlapi:org.semanticweb.hermit](https://repo1.maven.org/maven2/net/sourceforge/owlapi/org.semanticweb.hermit/1.4.5.519/)
