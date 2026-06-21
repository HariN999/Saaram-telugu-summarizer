# Evaluation Discussion & Analysis

## 📊 Dataset & Training Setup

| Item | Value |
| --- | --- |
| Test set | 1,302 samples (XL-Sum Telugu, BBC News Telugu) |
| Fine-tuning corpus | 1,302 samples (filtered, 10-150 word summaries) |
| Max input length | 384 tokens (fine-tuning), 512 tokens (inference) |
| Max output length | 96 tokens |

---

## 📊 Performance Comparison

| Model | ROUGE-1 | ROUGE-2 | ROUGE-L | BERTScore |
| --- | --- | --- | --- | --- |
| TF-IDF | 0.0324 | 0.0034 | 0.0320 | 0.6728 |
| mT5 Base | 0.0436 | 0.0022 | 0.0427 | 0.7239 |
| mT5 Fine-Tuned | 0.0404 | 0.0019 | 0.0400 | 0.7229 |

### Performance Analysis & Anomalies
Key insight: fine-tuning did not improve performance in this experiment because the dataset was limited and the pre-trained multilingual model already covered a similar distribution.

---

## 🧠 Key Learnings

- **Pre-trained multilingual models can outperform fine-tuned models** when fine-tuning data is limited.
- **BERTScore is often more informative than ROUGE** for morphologically rich languages like Telugu.
- **Fine-tuning large transformer models** requires significantly more data and compute for stable gains.
- **Extractive methods can show misleading ROUGE behavior** because lexical overlap does not always equal semantic quality.
- **Production deployments need graceful fallbacks** because hosted model loading can fail due to memory, cold starts, or tokenizer issues.

---

For the main project overview, see [README.md](../README.md).
