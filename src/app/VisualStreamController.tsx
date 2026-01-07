import React, { useState } from "react";

type VisualStreamControllerProps = {
    updateStream: (params: any) => Promise<void>;
  };
  
  export function VisualStreamController({ updateStream }: VisualStreamControllerProps) {
    const [styleUrls, setStyleUrls] = useState<string[]>([]);
  const [scale, setScale] = useState(1.0);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => {
        // 🪄 Replace this with your own uploader (S3, Supabase, etc.)
        const url = URL.createObjectURL(file);
        return url;
      })
    );
    setStyleUrls(uploaded);
  };

  const applyPreset = async () => {
    await updateStream({
      ip_adapter: { enabled: true, scale },
      ip_adapter_style_image_urls: styleUrls,
    });
  };

  return (
    <div>
      <h3>🎨 Visual Style Controls</h3>

      <input type="file" multiple accept="image/*" onChange={handleUpload} />
      <br />

      <label>IP-Adapter Strength: {scale.toFixed(1)}</label>
      <input
        type="range"
        min="0.2"
        max="1.5"
        step="0.1"
        value={scale}
        onChange={(e) => setScale(parseFloat(e.target.value))}
      />
      <br />

      <button onClick={applyPreset}>Apply Visual Style</button>
    </div>
  );
}
