# modal_app.py
from fastapi import HTTPException, Request
from modal import App, Image, Volume, fastapi_endpoint
import torch

app = App("medical-gpt-oss")

# Create a persistent volume for model cache
model_volume = Volume.from_name("medical-gpt-oss-models", create_if_missing=True)

# ---- Image (dependencies) ----
image = (
    Image.debian_slim()
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})  # Optimize memory allocation
    .run_commands(
        # Install torch with CUDA 12.8 support first
        "pip install torch --index-url https://download.pytorch.org/whl/cu128"
    )
    .pip_install(
        "transformers>=4.55.0",  # Required for gpt_oss model type
        "peft>=0.17.0",  # Updated version
        "trl>=0.20.0",  # Required for generate_answer
        "accelerate",
        "bitsandbytes",
        "sentencepiece",
        "huggingface_hub",  # For model downloading
        "fastapi",
        # Note: flash-attn requires compilation, skipping for now
        # Can be added later if needed with proper build setup
    )
)

# ---- MODEL DOWNLOADER (runs once to cache models) ----
@app.function(
    image=image,
    volumes={"/models": model_volume},
    timeout=1800,  # 30 minutes for initial download
)
def download_models():
    """Download and cache models to volume (runs once)"""
    import os
    from huggingface_hub import snapshot_download
    
    base_model_name = "openai/gpt-oss-20b"
    adapter_name = "dousery/medical-reasoning-gpt-oss-20b"
    
    # Set Hugging Face cache to volume
    os.environ["HF_HOME"] = "/models/hf_cache"
    os.environ["TRANSFORMERS_CACHE"] = "/models/hf_cache"
    os.environ["HF_DATASETS_CACHE"] = "/models/hf_cache"
    
    print(f"Downloading base model: {base_model_name}")
    snapshot_download(
        repo_id=base_model_name,
        local_dir="/models/base_model",
        local_dir_use_symlinks=False,
    )
    
    print(f"Downloading adapter: {adapter_name}")
    snapshot_download(
        repo_id=adapter_name,
        local_dir="/models/adapter",
        local_dir_use_symlinks=False,
    )
    
    model_volume.commit()  # Persist changes
    print("Models downloaded and cached to volume!")


# ---- GLOBAL MODEL LOADER ----
@app.function(
    gpu="H200:1",
    image=image,
    timeout=600,
    memory=128000,
    volumes={"/models": model_volume},
)  # H200 GPU with 141GB VRAM, 128GB RAM - Latest and fastest
def load_model():
    import os
    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    
    # Set Hugging Face cache to volume
    os.environ["HF_HOME"] = "/models/hf_cache"
    os.environ["TRANSFORMERS_CACHE"] = "/models/hf_cache"
    os.environ["HF_DATASETS_CACHE"] = "/models/hf_cache"
    
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import gc

    base_model_name = "openai/gpt-oss-20b"
    adapter_name = "dousery/medical-reasoning-gpt-oss-20b"

    if not hasattr(load_model, "model"):
        # Clear cache before loading
        torch.cuda.empty_cache()
        gc.collect()
        
        # Load from volume cache if available, otherwise from Hugging Face
        base_model_path = "/models/base_model"
        adapter_path = "/models/adapter"
        
        if os.path.exists(base_model_path):
            print("Loading model from volume cache...")
            tokenizer = AutoTokenizer.from_pretrained(
                base_model_path
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_path,
                dtype=torch.bfloat16,
                device_map="auto"
            )
            
            if os.path.exists(adapter_path):
                print(f"Loading adapter from volume: {adapter_path}")
                model = PeftModel.from_pretrained(base_model, adapter_path)
                print("Adapter loaded from volume successfully!")
            else:
                print(f"Adapter not in volume, loading from Hugging Face: {adapter_name}")
                model = PeftModel.from_pretrained(base_model, adapter_name)
                print("Adapter loaded from Hugging Face successfully!")
        else:
            print("Loading model from Hugging Face (first time)...")
            tokenizer = AutoTokenizer.from_pretrained(
                base_model_name,
                trust_remote_code=True
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                dtype=torch.bfloat16,
                device_map="auto",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                max_memory={0: "75GB"}
            )
            model = PeftModel.from_pretrained(base_model, adapter_name)

        model = model.merge_and_unload()  # Merge LoRA → full model
        model.eval()

        load_model.tokenizer = tokenizer
        load_model.model = model

    return load_model.tokenizer, load_model.model


# ---- INFERENCE FUNCTION ----
@app.function(
    gpu="H200:1",
    image=image,
    timeout=600,
    min_containers=1,
    memory=128000,
    volumes={"/models": model_volume},
)  # H200 GPU with 141GB VRAM, 128GB RAM - Latest and fastest
def generate_answer(message: str) -> str:
    """
    Generate answer from the model.
    Returns the full response (both thinking and final sections).
    Note: For streaming, we'll simulate it in the web UI layer.
    """
    import os
    import re
    import gc
    import torch  # Import torch for inference_mode
    
    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    
    # Set Hugging Face cache to volume
    os.environ["HF_HOME"] = "/models/hf_cache"
    os.environ["TRANSFORMERS_CACHE"] = "/models/hf_cache"
    os.environ["HF_DATASETS_CACHE"] = "/models/hf_cache"

    # Cache model in function attribute to avoid reloading on every call
    if not hasattr(generate_answer, "tokenizer") or not hasattr(generate_answer, "model"):
        print("Loading model from volume cache (first time in this container)...")
        
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        
        base_model_name = "openai/gpt-oss-20b"
        adapter_name = "dousery/medical-reasoning-gpt-oss-20b"
        
        # Clear cache before loading
        torch.cuda.empty_cache()
        gc.collect()
        
        # Load from volume cache if available, otherwise from Hugging Face
        base_model_path = "/models/base_model"
        adapter_path = "/models/adapter"
        
        if os.path.exists(base_model_path):
            print("Loading model from volume cache...")
            tokenizer = AutoTokenizer.from_pretrained(
                base_model_path
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_path,
                dtype=torch.bfloat16,
                device_map="auto"
            )
            
            if os.path.exists(adapter_path):
                print(f"Loading adapter from volume: {adapter_path}")
                model = PeftModel.from_pretrained(base_model, adapter_path)
                print("Adapter loaded from volume successfully!")
            else:
                print(f"Adapter not in volume, loading from Hugging Face: {adapter_name}")
                model = PeftModel.from_pretrained(base_model, adapter_name)
                print("Adapter loaded from Hugging Face successfully!")
        else:
            print("Volume cache not found, loading from Hugging Face...")
            tokenizer = AutoTokenizer.from_pretrained(
                base_model_name
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                dtype=torch.bfloat16,
                device_map="auto"
                # Note: flash_attention_2 requires flash-attn package
                # attn_implementation="flash_attention_2"  # Uncomment if flash-attn is installed
            )
            print(f"Loading adapter from Hugging Face: {adapter_name}")
            model = PeftModel.from_pretrained(base_model, adapter_name)
            print("Adapter loaded from Hugging Face successfully!")

        print("Merging LoRA adapter into base model...")
        model = model.merge_and_unload()  # Merge LoRA → full model
        print("LoRA adapter merged successfully!")
        model.eval()
        
        # Optimize model for faster inference
        print("Optimizing model for faster inference...")
        try:
            # Compile model with torch.compile for faster inference (PyTorch 2.0+)
            import torch._dynamo
            model = torch.compile(model, mode="reduce-overhead", fullgraph=True)
            print("Model compiled with torch.compile successfully!")
        except Exception as e:
            print(f"Warning: torch.compile failed: {e}. Continuing without compilation.")
        
        print("Model is ready for inference!")

        generate_answer.tokenizer = tokenizer
        generate_answer.model = model
        print("Model loaded and cached in container!")
    else:
        print("Using cached model from container memory")
    
    tokenizer = generate_answer.tokenizer
    model = generate_answer.model

    messages = [
        {
            "role": "system",
            "content": (
                "You are a medical reasoning assistant"
            ),
        },
        {"role": "user", "content": message},
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    # Optimized generation parameters for faster inference
    with torch.inference_mode():  # Faster inference mode (disables gradient computation)
        outputs = model.generate(
            **inputs,
            max_new_tokens=2048,
            temperature=0.2,
            do_sample=False,
            use_cache=True,  # Enable KV cache for faster generation
            pad_token_id=tokenizer.eos_token_id,  # Set pad token
            num_beams=1,  # Greedy decoding (fastest, no beam search)
        )

    raw = tokenizer.decode(outputs[0], skip_special_tokens=False)
    
    # Debug: Print raw output to check if model is finetuned
    print(f"Raw output length: {len(raw)}")
    print(f"Contains 'analysis': {'analysis' in raw}")
    print(f"Contains 'final': {'final' in raw}")

    thinking_pattern = r"<\|end\|><\|start\|>assistant<\|channel\|>analysis<\|message\|>(.*?)<\|end\|>"
    final_pattern = r"<\|start\|>assistant<\|channel\|>final<\|message\|>(.*?)<\|return\|>"

    thinking = re.search(thinking_pattern, raw, re.DOTALL)
    final = re.search(final_pattern, raw, re.DOTALL)
    
    print(f"Thinking match: {thinking is not None}")
    print(f"Final match: {final is not None}")

    if thinking and final:
        thinking_text = thinking.group(1).strip()
        final_text = final.group(1).strip()
        result = f"Thinking:\n{thinking_text}\n\nFinal:\n{final_text}"
        print(f"Found both thinking and final. Returning both.")
        return result
    elif final:
        final_text = final.group(1).strip()
        result = f"Final:\n{final_text}"
        print(f"WARNING: Only final found (no thinking).")
        return result
    else:
        # Model is not finetuned - return error message
        error_msg = "Hata: Finetune'lu model düzgün yüklenmemiş. Model yanıtında 'thinking' ve 'final' tag'leri bulunamadı. Lütfen adapter'ın yüklendiğini ve merge edildiğini kontrol edin."
        print(f"ERROR: Neither thinking nor final found. Model may not be finetuned.")
        return error_msg


@app.function(image=image, timeout=120)
@fastapi_endpoint(method="POST")
async def public_generate(request: Request):
    """
    Public HTTP endpoint that proxies requests to the GPU-backed generate_answer
    function. Deploy with `modal deploy modal_app.py` to expose it on the internet.
    """
    try:
        payload = await request.json()
    except Exception:
        return {"error": "Body must be valid JSON with a 'message' field."}

    message = payload.get("message") if isinstance(payload, dict) else None
    if not message or not isinstance(message, str):
        return {"error": "Field 'message' (string) is required."}

    # Forward the request to the GPU inference function
    try:
        result = await generate_answer.remote.aio(message)
    except Exception as exc:
        print(f"generate_answer failed: {exc}")
        raise HTTPException(status_code=500, detail="Internal model error. Check logs.") from exc
    return {"response": result}