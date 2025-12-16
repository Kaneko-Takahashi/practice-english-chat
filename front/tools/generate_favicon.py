#!/usr/bin/env python3
"""
Favicon 生成スクリプト

front/public/icon-source.png から最適化された favicon を生成します。
- 中心基準で 1.15〜1.25倍拡大してクローズアップ
- 円形マスクを適用して円の外側を透明化
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw

# プロジェクトルート（このスクリプトの親ディレクトリの親）
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
# ソース画像の候補（優先順位順）
SOURCE_IMAGE_CANDIDATES = [
    PROJECT_ROOT / "public" / "icon-source.png",
    PROJECT_ROOT / "app" / "icon.png",  # 既存のアイコンをフォールバックとして使用
]
OUTPUT_DIR = PROJECT_ROOT / "public"

# 生成するサイズ
SIZES = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon-48x48.png": 48,  # ICO 用にも使用
    "icon.png": 512,
    "apple-touch-icon.png": 180,
}

# ICO に含めるサイズ
ICO_SIZES = [16, 32, 48]


def create_circular_mask(size):
    """円形マスクを作成"""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    # 円を描画（少し内側に描画してエッジを滑らかに）
    draw.ellipse([1, 1, size - 2, size - 2], fill=255)
    return mask


def process_image(source_img, target_size, zoom_factor=1.2):
    """
    画像を処理して favicon を生成
    
    Args:
        source_img: ソース画像（PIL Image）
        target_size: 出力サイズ
        zoom_factor: 拡大倍率（1.15〜1.25の範囲）
    """
    # ソース画像のサイズを取得
    src_width, src_height = source_img.size
    
    # 正方形にクロップ（短い辺に合わせる）
    min_size = min(src_width, src_height)
    left = (src_width - min_size) // 2
    top = (src_height - min_size) // 2
    cropped = source_img.crop((left, top, left + min_size, top + min_size))
    
    # 拡大（中心基準）
    zoomed_size = int(min_size * zoom_factor)
    # 拡大後の画像を作成（中心からクロップ）
    zoomed = cropped.resize((zoomed_size, zoomed_size), Image.Resampling.LANCZOS)
    
    # 元のサイズに戻す（中心部分をクロップ）
    crop_left = (zoomed_size - min_size) // 2
    crop_top = (zoomed_size - min_size) // 2
    zoomed_cropped = zoomed.crop((
        crop_left,
        crop_top,
        crop_left + min_size,
        crop_top + min_size
    ))
    
    # ターゲットサイズにリサイズ
    resized = zoomed_cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # RGBA モードに変換（透明度を扱うため）
    if resized.mode != "RGBA":
        resized = resized.convert("RGBA")
    
    # 円形マスクを適用
    mask = create_circular_mask(target_size)
    resized.putalpha(mask)
    
    return resized


def generate_ico(images_by_size, output_path):
    """複数のサイズから ICO ファイルを生成"""
    # 利用可能なサイズを優先順位で選択
    available_sizes = []
    for size in ICO_SIZES:
        if size in images_by_size:
            available_sizes.append((size, size))
    
    if not available_sizes:
        # フォールバック: 最小サイズを使用
        min_size = min(images_by_size.keys())
        available_sizes = [(min_size, min_size)]
        images_by_size[min_size].save(output_path, format="ICO", sizes=available_sizes)
    else:
        # 各サイズの画像を明示的に用意して ICO を生成
        # Pillow の ICO 保存は sizes パラメータで複数サイズを含められる
        # 最大サイズの画像をベースに、sizes パラメータで各サイズを指定
        max_size = max([s[0] for s in available_sizes])
        images_by_size[max_size].save(output_path, format="ICO", sizes=available_sizes)


def main():
    """メイン処理"""
    # ソース画像の存在確認（候補から探す）
    SOURCE_IMAGE = None
    for candidate in SOURCE_IMAGE_CANDIDATES:
        if candidate.exists():
            SOURCE_IMAGE = candidate
            break
    
    if SOURCE_IMAGE is None:
        print("エラー: ソース画像が見つかりません。", file=sys.stderr)
        print("以下のいずれかのファイルを配置してください:", file=sys.stderr)
        for candidate in SOURCE_IMAGE_CANDIDATES:
            print(f"  - {candidate}", file=sys.stderr)
        sys.exit(1)
    
    print(f"ソース画像を使用: {SOURCE_IMAGE}")
    
    # ソース画像を読み込み
    try:
        source_img = Image.open(SOURCE_IMAGE)
        if source_img.mode != "RGBA":
            source_img = source_img.convert("RGBA")
    except Exception as e:
        print(f"エラー: 画像の読み込みに失敗しました: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 出力ディレクトリの確認
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 拡大倍率（1.15〜1.25の範囲で調整可能）
    zoom_factor = 1.2
    
    # ICO 用の画像を保存
    ico_images = {}
    
    # 各サイズの favicon を生成
    for filename, size in SIZES.items():
        output_path = OUTPUT_DIR / filename
        processed = process_image(source_img, size, zoom_factor)
        processed.save(output_path, "PNG")
        print(f"[OK] 生成: {output_path} ({size}x{size})")
        
        # ICO 用に保存
        if size in ICO_SIZES:
            ico_images[size] = processed
    
    # ICO ファイルを生成
    ico_path = OUTPUT_DIR / "favicon.ico"
    if ico_images:
        generate_ico(ico_images, ico_path)
        print(f"[OK] 生成: {ico_path} (サイズ: {', '.join([f'{s}x{s}' for s in sorted(ico_images.keys())])})")
    
    print("\n[完了] すべての favicon の生成が完了しました！")
    print(f"\n生成されたファイル:")
    for filename in SIZES.keys():
        print(f"  - {OUTPUT_DIR / filename}")
    print(f"  - {ico_path}")


if __name__ == "__main__":
    main()
