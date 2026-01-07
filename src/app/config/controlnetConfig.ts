// Compact reusable ControlNet configuration

export const CONTROLNET_CONFIG = [
    {
      name: "pose",
      enabled: true,
      model_id: "thibaud/controlnet-sd21-openpose-diffusers",
      preprocessor: "pose_tensorrt",
      conditioning_scale: 0.8,
    },
    {
      name: "color",
      enabled: true,
      model_id: "thibaud/controlnet-sd21-color-diffusers",
      preprocessor: "passthrough",
      conditioning_scale: 0.7,
    },
    {
      name: "depth",
      enabled: true,
      model_id: "thibaud/controlnet-sd21-depth-diffusers",
      preprocessor: "depth_tensorrt",
      conditioning_scale: 0.6,
    },
  ];
  