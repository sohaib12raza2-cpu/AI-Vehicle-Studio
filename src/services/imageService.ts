import { ImagePrompt, GeneratedImage, ScriptSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function generateImages(
  prompts: ImagePrompt[],
  settings: ScriptSettings
): Promise<GeneratedImage[]> {
  const totalImages = prompts.reduce((sum, p) => sum + (p.imagesToGenerate || 1), 0);
  await new Promise(resolve => setTimeout(resolve, 2000 + totalImages * 200));

  const getDimensions = (ratio: string) => {
    switch (ratio) {
      case '9:16': return { w: 576, h: 1024 };
      case '1:1':  return { w: 1024, h: 1024 };
      case '16:9': default: return { w: 1024, h: 576 };
    }
  };
  const { w, h } = getDimensions(settings.aspectRatio);

  const generatedImages: GeneratedImage[] = [];

  prompts.forEach((prompt, promptIndex) => {
    const count = prompt.imagesToGenerate || 1;
    for (let i = 0; i < count; i++) {
      const seed = `${prompt.id.substring(0, 8)}-${promptIndex}-${i}`;
      generatedImages.push({
        id: uuidv4(),
        promptId: prompt.id,
        segmentId: prompt.segmentId,
        url: `https://picsum.photos/seed/${seed}/${w}/${h}?blur=2`,
        isFavorite: false,
        // ── Mapping data inherited from the source prompt ──
        promptTitle: prompt.title,
        sourceSentenceIds: prompt.sourceSentenceIds ?? [],
        useType: prompt.useType ?? 'Main Visual',
        recommendedPlacement: prompt.recommendedPlacement ?? 'Mid Sentence',
      });
    }
  });

  return generatedImages;
}
