import Image from "next/image";
import { initials, playerPhoto } from "@/lib/playerPhotos";

// Portraits only exist for the current top 100. Everyone else -- and the few
// top-100 players Commons has no free photograph of -- gets a monogram in the
// same circle, so the header keeps its shape either way.
//
// Sized in CSS rather than by prop so it can step down on small screens,
// where a full-size circle would push the name onto a second line.
export default function PlayerAvatar({ id, name }: { id: number; name: string }) {
  const photo = playerPhoto(id);

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-fg/[0.05] ring-1 ring-fg/[0.08] sm:h-[120px] sm:w-[120px]">
      {photo ? (
        <Image
          src={photo.src}
          alt={name}
          width={240}
          height={240}
          priority
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center text-[25px] font-medium tracking-tight text-fg/35 sm:text-[38px]"
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
