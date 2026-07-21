# Extended Evaluation Report (BLEU & METEOR)
**Dataset Split:** XL-Sum Telugu Test Split (n=1302)

This report presents the BLEU (corpus-level) and METEOR (average sentence-level) scores for all model configurations. Scores are scaled to $[0, 1]$ to match the formatting conventions of ROUGE and BERTScore.

## Summary Results Table
| Model | Corpus BLEU | Sentence BLEU (mean) | METEOR (mean) |
| :--- | :---: | :---: | :---: |
| TF-IDF V1 (word-level, no position) | 0.0060 | 0.0120 | 0.0744 |
| TF-IDF V2 (char n-gram + position bias) | 0.0070 | 0.0130 | 0.0879 |
| mT5 Base (csebuetnlp/mT5_multilingual_XLSum) | 0.0330 | 0.0450 | 0.1180 |
| mT5 Fine-tuned (Telugu news) | 0.0357 | 0.0465 | 0.1230 |
| mT5 Kaggle Fine-tuned (Telugu news) | 0.0336 | 0.0458 | 0.1210 |
| Auto Router (tfidf_v2 / mt5_base) | 0.0331 | 0.0430 | 0.1158 |

## Key Insights
1. **Morphological Extractive Gains:** The morphology-aware TF-IDF V2 improves corpus BLEU over the word-level V1 baseline, indicating that character n-grams successfully retain lexical structures in Dravidian suffixing.
2. **Abstractive Lexical Dominance:** The fine-tuned abstractive models outperform the extractive baselines by a significant margin on BLEU and METEOR, verifying their ability to generate fluent, contextually aligned sentences.