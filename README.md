# Medical GPT-OSS 20B

A fine-tuned version of `openai/gpt-oss-20b` specifically optimized for medical reasoning and clinical decision-making. The model has been trained on high-quality medical reasoning datasets to provide accurate and thoughtful responses to medical queries.

## 🏥 Key Features

- **Medical Expertise**: Specialized in medical reasoning, diagnosis, and clinical decision-making
- **Complex Reasoning**: Uses chain-of-thought reasoning for medical problems
- **Adapter-Only Training**: Only LoRA layers are trained, base model remains frozen
- **Efficient**: Lightweight fine-tuning, smaller storage footprint
- **Ready-to-Use**: Requires base model + adapter for inference

## 🌐 Live Demo

- **Web Interface**: [Render Deployment](https://medicalgpt-dojs.onrender.com)
- **API Endpoint**: Deployed on Modal Labs

## 📊 Training Details

### Training Data
- **Dataset**: `Freedomintelligence/medical-o1-reasoning-SFT`
- **Language**: English
- **Size**: 10.000 medical reasoning examples
- **Format**: Question-Answer pairs with complex chain-of-thought reasoning

### Training Configuration
- **Base Model**: `openai/gpt-oss-20b` (20B parameters)
- **Training Method**: LoRA (adapter-only fine-tuning)
- **LoRA Rank**: 8
- **Learning Rate**: 5e-5
- **Batch Size**: 4 per device, gradient_accumulation_steps=4
- **Epochs**: 2
- **Max Sequence Length**: 2048
- **LR Scheduler**: Cosine, warmup_ratio=0.05
- **Final Training Loss**: 1.22

### Model Architecture
- **Parameters**: 20.9 billion
- **Architecture**: GPT-OSS (Transformer-based)
- **Context Length**: 2,048 tokens
- **Trainable Parameters**: 3.98M (0.02% of total)

## 🎯 Intended Use

### Primary Use Cases
- Medical Education: Explaining medical concepts and procedures
- Clinical Reasoning: Analyzing symptoms and differential diagnosis
- Research Support: Assisting in medical research and literature review
- Decision Support: Providing reasoning for clinical decisions (with human oversight)

## ⚠️ Important Disclaimers

- **Not a Medical Device**: This model is for educational and research purposes only
- **Human Oversight Required**: All medical decisions should involve qualified healthcare professionals
- **Accuracy Not Guaranteed**: Model outputs should be verified against current medical literature
- **Regional Variations**: Training data may not reflect all regional medical practices

## 🔍 Evaluation

The model demonstrates strong performance in:
- Medical concept explanation
- Differential diagnosis reasoning
- Treatment option analysis
- Pathophysiology understanding


## 🛠️ Technical Requirements

### Minimum Requirements
- **GPU Memory**: 16GB+ VRAM recommended
- **RAM**: 32GB+ system memory
- **Storage**: 40GB+ free space

## 📜 License

This model is released under the Apache 2.0 license. Please review the license terms before commercial use.

## 🙏 Acknowledgments

- **Base Model**: [openai/gpt-oss-20b](https://huggingface.co/openai/gpt-oss-20b)
- **Adapter/Training**: [dousery/medical-reasoning-gpt-oss-20b](https://huggingface.co/dousery/medical-reasoning-gpt-oss-20b)
- **Dataset**: Freedomintelligence
- **Infrastructure**: Modal Labs for GPU compute

