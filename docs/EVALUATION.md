# Evaluation Discussion & Analysis

## 📊 Dataset & Training Setup

| Item | Value |
| --- | --- |
| Test set | 1,302 samples (XL-Sum Telugu, BBC News Telugu) |
| Fine-tuning corpus | 10,421 samples (XL-Sum Telugu training split) |
| Max input length | 384 tokens (training), 512 tokens (inference) |
| Max output length | 96 tokens (training), 128 tokens (inference) |

---

## 📊 Performance Comparison

| Model | ROUGE-1 | ROUGE-2 | ROUGE-L | BERTScore |
| --- | --- | --- | --- | --- |
| TF-IDF V1 (Word-level) | 0.0709 | 0.0128 | 0.0554 | 0.6626 |
| TF-IDF V2 (Char n-gram) | 0.0811 | 0.0162 | 0.0628 | 0.6671 |
| mT5 Base | 0.1610 | 0.0478 | 0.1420 | 0.7273 |
| mT5 Fine-Tuned (8-bit LoRA) | 0.1639 | 0.0496 | 0.1452 | 0.7272 |

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
