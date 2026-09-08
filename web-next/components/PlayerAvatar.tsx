import Image from "next/image";
import { initials, playerPhoto } from "@/lib/playerPhotos";

// Portraits only exist for the current top 100. Everyone else -- and the few
// top-100 players Commons has no free photograph of -- gets a monogram in the
// same circle, so the header keeps its shape either way.
//
// Sized in CSS rather than by prop: at 375px an 88px circle pushes the name
// onto a second line, so it steps down on small screens.
export default function PlayerAvatar({ id, name }: { id: number; name: string }) {
  const photo = playerPhoto(id);

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-fg/[0.05] ring-1 ring-fg/[0.08] sm:h-[88px] sm:w-[88px]">
      {photo ? (
        <Image
          src={photo.src}
          alt={name}
          width={176}
          height={176}
          priority
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center text-[20px] font-medium tracking-tight text-fg/35 sm:text-[28px]"
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
