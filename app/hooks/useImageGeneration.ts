import { useState } from "react";
import { toast } from "sonner";

export function useImageGeneration() {
  const [image, setImage] = useState<string | null>(null);  // Stores the generated image URL
  const [isLoading, setIsLoading] = useState(false);  // Manages loading state
  const [error, setError] = useState<string | null>(null);  // Manages error state

  // Function to handle the image generation request
  const generateImage = async (prompt: string) => {
    if (!prompt) {
      toast.error("Please provide a valid prompt for image generation.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (data.image) {
        setImage(data.image);  // Set the generated image URL
      } else {
        setError("Image generation failed.");
        toast.error("Failed to generate image.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      setError("Error generating image. Please try again.");
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return { image, isLoading, error, generateImage };
}
