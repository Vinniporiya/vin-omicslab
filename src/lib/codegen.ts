import type { CodeArtifact } from '../data/schema';

export interface CodeParams { typeLabel: string; minCells: number; fdr: number; lfc: number }

/**
 * Code templates for the analysis a real run would execute.
 * They are TEMPLATES: not executed by the demo, and package APIs change between versions.
 * The UI reads `executed` and never presents them as the code that produced a demo result.
 */
export function buildCode(p: CodeParams): CodeArtifact[] {
  const R = `# Vin-OmicsLab template: pseudobulk differential expression (R)
# STATUS: template, not executed by Vin-OmicsLab. Check each step against your data and package versions.
suppressPackageStartupMessages({
  library(SingleCellExperiment)
  library(muscat)
  library(edgeR)
})

params <- list(cell_type = "${p.typeLabel}", min_cells = ${p.minCells}, fdr = ${p.fdr}, lfc = ${p.lfc})

sce <- readRDS("input/sce_annotated.rds")   # raw counts in assay "counts"
sce <- prepSCE(sce, kid = "cell_type", gid = "condition", sid = "donor", drop = TRUE)

# One pseudobulk profile per cell type x donor (donor is the replicate)
pb <- aggregateData(sce, assay = "counts", fun = "sum", by = c("cluster_id", "sample_id"))

ei <- metadata(sce)$experiment_info
mm <- model.matrix(~ 0 + ei$group_id)            # add batch, sex, age here if recorded
dimnames(mm) <- list(ei$sample_id, levels(ei$group_id))
contrast <- makeContrasts("Disease - Control", levels = mm)

res <- pbDS(pb, method = "edgeR", design = mm, contrast = contrast,
            min_cells = params$min_cells, filter = "both")
tbl <- res$table[["Disease - Control"]][[params$cell_type]]
tbl <- tbl[order(tbl$p_adj.loc), ]
sig <- subset(tbl, p_adj.loc < params$fdr & abs(logFC) >= params$lfc)

dir.create("results", showWarnings = FALSE)
write.csv(tbl, "results/de_pseudobulk.csv", row.names = FALSE)
writeLines(capture.output(sessionInfo()), "results/sessionInfo.txt")   # provenance
`;
  const PY = `# Vin-OmicsLab template: pseudobulk differential expression (Python)
# STATUS: template, not executed by Vin-OmicsLab. decoupler and pydeseq2 APIs differ across versions.
import pandas as pd
import scanpy as sc
import decoupler as dc
from pydeseq2.dds import DeseqDataSet
from pydeseq2.ds import DeseqStats

CELL_TYPE = "${p.typeLabel}"
MIN_CELLS, FDR, LFC = ${p.minCells}, ${p.fdr}, ${p.lfc}

adata = sc.read_h5ad("input/adata_annotated.h5ad")      # raw counts in adata.layers["counts"]
pdata = dc.get_pseudobulk(
    adata, sample_col="donor", groups_col="cell_type",
    layer="counts", mode="sum", min_cells=MIN_CELLS, min_counts=1000,
)
sub = pdata[pdata.obs["cell_type"] == CELL_TYPE].copy()

counts = pd.DataFrame(sub.X, index=sub.obs_names, columns=sub.var_names).round().astype(int)
dds = DeseqDataSet(counts=counts, metadata=sub.obs, design_factors="condition")  # add batch here
dds.deseq2()

stats = DeseqStats(dds, contrast=("condition", "Disease", "Control"))
stats.summary()
res = stats.results_df.sort_values("padj")
sig = res[(res["padj"] < FDR) & (res["log2FoldChange"].abs() >= LFC)]

res.to_csv("results/de_pseudobulk.csv")
`;
  const SNAKE = `# Vin-OmicsLab template workflow (Snakemake)
# STATUS: template. Rule bodies call scripts that must be supplied and containerised before execution.
configfile: "config.yaml"

rule all:
    input: "results/report.html"

rule qc:
    input: "input/raw_counts/"
    output: "work/qc.h5ad"
    script: "scripts/qc.py"

rule normalise_integrate:
    input: "work/qc.h5ad"
    output: "work/integrated.h5ad"
    script: "scripts/integrate.py"

rule annotate:
    input: "work/integrated.h5ad"
    output: "work/annotated.h5ad"
    script: "scripts/annotate.py"

rule pseudobulk_de:
    input: "work/annotated.h5ad"
    output: "results/de_pseudobulk.csv"
    script: "scripts/pseudobulk_de.R"

rule pathways:
    input: "results/de_pseudobulk.csv"
    output: "results/pathways.csv"
    script: "scripts/pathways.R"

rule report:
    input: "results/de_pseudobulk.csv", "results/pathways.csv"
    output: "results/report.html"
    script: "scripts/report.Rmd"
`;
  const CFG = `# config.yaml: every parameter of the run lives here and is stored with the results
cell_type: "${p.typeLabel}"
min_cells: ${p.minCells}
fdr: ${p.fdr}
log2fc_threshold: ${p.lfc}
design: "~ condition"        # TODO: add batch / covariates
gene_set_database: "TODO: name and version"
`;
  const ENV = `# environment.yml: package versions are NOT pinned in this template.
# TODO: pin exact versions (or use a container digest) before a run can be called reproducible.
name: vin-omicslab-analysis
channels: [conda-forge, bioconda]
dependencies:
  - python
  - r-base
  - scanpy
  - decoupler-py
  - pydeseq2
  - bioconductor-muscat
  - bioconductor-edger
  - bioconductor-singlecellexperiment
  - snakemake
`;
  const mk = (language: CodeArtifact['language'], filename: string, content: string): CodeArtifact => ({ id: filename, language, filename, content, executed: false });
  return [mk('R', 'pseudobulk_de.R', R), mk('Python', 'pseudobulk_de.py', PY), mk('Snakemake', 'Snakefile', SNAKE), mk('YAML', 'config.yaml', CFG), mk('YAML', 'environment.yml', ENV)];
}

export const WORKFLOW_RULES = ['qc', 'normalise_integrate', 'annotate', 'pseudobulk_de', 'pathways', 'report'];
