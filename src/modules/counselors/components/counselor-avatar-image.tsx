import { AvatarImage } from "@/components/ui/avatar";

const companyOneImage = {
  src: "/counselors/company-01.jpg",
  width: 2047,
  height: 2561,
};

// The supplied company poster labels Ariel on the left and Yuleidy on the right.
// Keep the original photo and frame each portrait by the counselor's stable ID.
const portraits: Record<string, { x: number; y: number; size: number }> = {
  "2d853dd2-91d5-4265-bf41-0b7aa183e639": { x: 615, y: 775, size: 410 },
  "f4d6e5e0-86a9-449d-8a46-e7450bc1926a": { x: 955, y: 810, size: 410 },
};

export function CounselorAvatarImage({ counselorId }: { counselorId: string }) {
  const portrait = portraits[counselorId];
  if (!portrait) return null;

  return (
    <AvatarImage
      src={companyOneImage.src}
      alt=""
      className="absolute max-w-none rounded-none object-fill"
      style={{
        width: `${(companyOneImage.width / portrait.size) * 100}%`,
        height: `${(companyOneImage.height / portrait.size) * 100}%`,
        left: `${(-portrait.x / portrait.size) * 100}%`,
        top: `${(-portrait.y / portrait.size) * 100}%`,
      }}
    />
  );
}
