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

const companyThreeImage = {
  src: "/counselors/company-03.png",
  width: 2047,
  height: 2561,
};

const companyFourImage = {
  src: "/counselors/company-04.png",
  width: 2047,
  height: 2561,
};

const companyFiveImage = {
  src: "/counselors/company-05.png",
  width: 2047,
  height: 2561,
};

const companySixImage = {
  src: "/counselors/company-06.png",
  width: 2047,
  height: 2561,
};

const companySevenImage = {
  src: "/counselors/company-07.png",
  width: 2047,
  height: 2561,
};

const companyEightImage = {
  src: "/counselors/company-08.png",
  width: 2047,
  height: 2561,
};

const companyNineImage = {
  src: "/counselors/company-09.png",
  width: 2047,
  height: 2561,
};

const companyTenImage = {
  src: "/counselors/company-10.png",
  width: 2047,
  height: 2561,
};

const companyElevenImage = {
  src: "/counselors/company-11.png",
  width: 2047,
  height: 2561,
};

const companyTwelveImage = {
  src: "/counselors/company-12.png",
  width: 2047,
  height: 2561,
};

// Map portraits using individual poster labels or the user's identification.
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
  "2b58d125-7e55-4422-91c7-cc7205867d9c": {
    image: companyThreeImage, x: 592, y: 850, size: 440,
  },
  "a1c97de5-38f4-4fcd-bdf9-ce246fbe327f": {
    image: companyThreeImage, x: 1027, y: 847, size: 400,
  },
  "1a165337-27df-4370-b8a1-cf8107d79f45": {
    image: companyFourImage, x: 360, y: 845, size: 400,
  },
  "ddd93adf-9cbe-4673-8240-62914bc23ae8": {
    image: companyFourImage, x: 1205, y: 920, size: 600,
  },
  "7ac49bc5-dbc5-48a2-b9d1-fda0704c2c6e": {
    image: companyFiveImage, x: 1075, y: 1010, size: 440,
  },
  "f93c83ff-29f6-4743-bb2f-d5d504f2a590": {
    image: companyFiveImage, x: 535, y: 1080, size: 430,
  },
  "d4463bb2-61e7-4a85-af2c-623b171b4ab5": {
    image: companySixImage, x: 637, y: 955, size: 400,
  },
  "bd14f774-1632-4a74-9f6c-cfb2e9bede88": {
    image: companySixImage, x: 1046, y: 840, size: 400,
  },
  "069aabda-e877-4e55-918d-ea1ee2392a00": {
    image: companySevenImage, x: 605, y: 970, size: 400,
  },
  "e45f2a61-0e68-42e6-b245-a9ce6949a6e0": {
    image: companySevenImage, x: 995, y: 820, size: 430,
  },
  "9013dc50-59d2-4086-92f4-d971de4a8b76": {
    image: companyEightImage, x: 317, y: 838, size: 430,
  },
  "b534fb39-499d-4a40-886a-d63f07273c41": {
    image: companyEightImage, x: 1360, y: 840, size: 310,
  },
  "f6b5f0b7-1e90-42c0-8b42-ce15b1101bf3": {
    image: companyNineImage, x: 645, y: 875, size: 390,
  },
  "e011b0c0-4ef3-4051-be09-b7fdbb95de89": {
    image: companyNineImage, x: 1000, y: 975, size: 420,
  },
  "0a7037c8-666c-402b-9971-af28721e3f6a": {
    image: companyTenImage, x: 630, y: 775, size: 460,
  },
  "5c9143b4-7f60-4a1f-b7cf-3d4429911b51": {
    image: companyTenImage, x: 985, y: 940, size: 490,
  },
  "848b22fc-b824-41ca-a0cc-895d564105f6": {
    image: companyElevenImage, x: 635, y: 745, size: 450,
  },
  "b989dfeb-8dc5-4671-a3f5-bc5fe8b18b71": {
    image: companyElevenImage, x: 950, y: 990, size: 430,
  },
  "4f5f16cb-6b69-4557-a3dc-c8170419b481": {
    image: companyTwelveImage, x: 595, y: 850, size: 410,
  },
  "0620dc55-f5a8-4804-9734-7b7c29a25776": {
    image: companyTwelveImage, x: 940, y: 780, size: 450,
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
