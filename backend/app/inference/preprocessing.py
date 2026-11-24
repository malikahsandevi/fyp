from PIL import Image
from torchvision import transforms
from torchvision.transforms import InterpolationMode

_INTERP = {
    "bilinear": InterpolationMode.BILINEAR,
    "bicubic": InterpolationMode.BICUBIC,
    "nearest": InterpolationMode.NEAREST,
}


def preprocess_image(image: Image.Image, config: dict):
    """Evaluation-time preprocessing driven entirely by the model's config.json."""
    size = config["input_size"]
    if len(size) != 2 or any(int(x) <= 0 for x in size):
        raise ValueError("input_size must contain [height, width]")
    if config.get("color_mode", "RGB") != "RGB":
        raise ValueError("Only RGB preprocessing is supported")
    original_size = [int(image.width), int(image.height)]
    pipeline = transforms.Compose([
        transforms.Resize((int(size[0]), int(size[1])), interpolation=_INTERP.get(config.get("resize_interpolation", "bilinear"), InterpolationMode.BILINEAR)),
        transforms.ToTensor(),
        transforms.Normalize(mean=config["mean"], std=config["std"]),
    ])
    return pipeline(image.convert("RGB")).unsqueeze(0), original_size
