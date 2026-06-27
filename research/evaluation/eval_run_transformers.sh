#!/bin/bash
# eval_run_transformers.sh
# Run mT5 Base and mT5 Fine-tuned evaluation on the full 1,302-sample XL-Sum Telugu test set.
# Supports resume (--resume) in case of interruption.
#
# Usage:
#   chmod +x eval_run_transformers.sh
#   ./eval_run_transformers.sh           # fresh run
#   ./eval_run_transformers.sh --resume  # resume after crash
#
# On CPU: expect ~15–25 min per model (1302 × ~1s/sample on laptop CPU)
# On GPU: expect ~3–5 min per model

set -e
cd "$(dirname "$0")"
source ../../myenv/bin/activate

RESUME_FLAG="${1:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "================================================"
echo "  Telugu Summarization — Transformer Evaluation"
echo "  Models: mt5_base, mt5_finetuned"
echo "  Resume: ${RESUME_FLAG}"
echo "  Start : $(date)"
echo "================================================"

echo ""
echo ">>> mT5 Base evaluation..."
python3 ../../backend/rouge_eval.py --model mt5_base $RESUME_FLAG 2>&1 | tee ../../backend/eval_results/mt5_base_run_${TIMESTAMP}.log
echo ""

echo ">>> mT5 Fine-tuned evaluation..."
python3 ../../backend/rouge_eval.py --model mt5_finetuned $RESUME_FLAG 2>&1 | tee ../../backend/eval_results/mt5_finetuned_run_${TIMESTAMP}.log
echo ""

echo "================================================"
echo "  Both transformer models complete."
echo "  End: $(date)"
echo "================================================"
