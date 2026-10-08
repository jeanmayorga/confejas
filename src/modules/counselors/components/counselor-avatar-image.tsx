import { AvatarImage } from "@/components/ui/avatar";

const companyOneImage = {
  src: "/counselors/company-01.jpg",
  width: 2047,
  height: 2561,
};

const companyTwoImage = {
  src: "/counselors/company-02.jpg",
  width: 2047,
  height: 2561,
};

// Use the names printed on the supplied posters to map each portrait to its ID.
// Keep the original images and frame the portraits in their avatars.
const portraits: Record<
  string,
  { image: typeof companyOneImage; x: number; y: number; size: number }
> = {
  "2d853dd2-91d5-4265-bf41-0b7aa183e639": {
    image: companyOneImage, x: 615, y: 775, size: 410,
  },
  "f4d6e5e0-86a9-449d-8a46-e7450bc1926a": {
    image: companyOneImage, x: 955, y: 810, size: 410,
  },
  "78faf2a1-513f-436a-9b1e-af80f44e9a07": {
    image: companyTwoImage, x: 250, y: 843, size: 560,
  },
  "f3c2ba4d-416e-4153-a169-5e2e300e289b": {
    image: companyTwoImage, x: 1240, y: 815, size: 540,
  },
};

export function CounselorAvatarImage({ counselorId }: { counselorId: string }) {
  const portrait = portraits[counselorId];
  if (!portrait) return null;

  return (
    <AvatarImage
      src={portrait.image.src}
      alt=""
      className="absolute max-w-none rounded-none object-fill"
      style={{
        width: `${(portrait.image.width / portrait.size) * 100}%`,
        height: `${(portrait.image.height / portrait.size) * 100}%`,
        left: `${(-portrait.x / portrait.size) * 100}%`,
        top: `${(-portrait.y / portrait.size) * 100}%`,
      }}
    />
  );
}
