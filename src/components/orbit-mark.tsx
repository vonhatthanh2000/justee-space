import Image from "next/image";

export function OrbitMark() {
  return (
    <div className="orbit-mark" aria-hidden="true">
      <span className="orbit-ring orbit-ring-one" />
      <span className="orbit-ring orbit-ring-two" />
      <span className="orbit-core">
        <Image
          src="/images/avatar-transperant.webp"
          alt="Portrait of Thanh"
          fill
          sizes="(max-width: 860px) 68vw, 280px"
          priority
        />
      </span>
    </div>
  );
}
