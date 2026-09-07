import type { StaticImageData } from "next/image";

import pcSetup2025 from "./images/2025-pc-setup.webp";
import aotConcert from "./images/aot-concert.webp";
import healingMotoTrip from "./images/healing-moto-trip.webp";
import landmark81Bw from "./images/landmark-81-bw.webp";
import myNewCamera from "./images/my-new-camera.webp";
import myWarFingerstyleGuitar from "./images/my-war-fingerstyle-guitar.webp";
import saigonAfterTheRain from "./images/saigon-after-the-rain.webp";
import sonyA6400 from "./images/sony-a6400.webp";
import sonyShow from "./images/sony-show.webp";
import sonyWorkshopStaff from "./images/sony-workshop-staff.webp";
import vinhomeCentralParkOffice from "./images/vinhome-central-park-office.webp";

export type Photo = {
  title: string;
  image: StaticImageData;
  aspectRatio: `${number}:${number}`;
  category: string;
  role: string | null;
  sortOrder: number;
  url?: string;
};

const photoEntries = [
  {
    title: "Vinhome Central Park Office",
    image: vinhomeCentralParkOffice,
    aspectRatio: "3:2",
    category: "Photography",
    role: null,
    sortOrder: 0,
  },
  {
    title: "Healing moto trip",
    image: healingMotoTrip,
    aspectRatio: "16:9",
    category: "Activity",
    role: null,
    sortOrder: 0,
    url: "https://www.instagram.com/p/DTDSI-_Eyco/",
  },
  {
    title: "Landmark 81 BW",
    image: landmark81Bw,
    aspectRatio: "3:4",
    category: "Photography",
    role: null,
    sortOrder: 0,
  },
  {
    title: "Saigon After the rain",
    image: saigonAfterTheRain,
    aspectRatio: "16:9",
    category: "Photography",
    role: null,
    sortOrder: 0,
  },
  {
    title: "AOT Concert",
    image: aotConcert,
    aspectRatio: "3:4",
    category: "Photography",
    role: null,
    sortOrder: 0,
  },
  {
    title: "My War - Fingerstyle Guitar",
    image: myWarFingerstyleGuitar,
    aspectRatio: "16:9",
    category: "Music Video",
    role: "Director, Cameraman, Editor",
    sortOrder: 0,
    url: "https://www.youtube.com/watch?v=uwcglBpgXdM",
  },
  {
    title: "Sony workshop staff",
    image: sonyWorkshopStaff,
    aspectRatio: "3:4",
    category: "Event",
    role: null,
    sortOrder: 0,
  },
  {
    title: "2025 PC Setup",
    image: pcSetup2025,
    aspectRatio: "3:2",
    category: "Gear",
    role: null,
    sortOrder: 0,
  },
  {
    title: "Sony a6400",
    image: sonyA6400,
    aspectRatio: "1:1",
    category: "Gear",
    role: null,
    sortOrder: 0,
  },
  {
    title: "My new Camera",
    image: myNewCamera,
    aspectRatio: "1:1",
    category: "Gear",
    role: null,
    sortOrder: 1,
  },
  {
    title: "Sony Show",
    image: sonyShow,
    aspectRatio: "3:2",
    category: "Event",
    role: null,
    sortOrder: 2,
  },
] satisfies readonly Photo[];

/**
 * Gallery photos in display order. JavaScript's stable sort keeps source order
 * when multiple entries share the same sortOrder.
 */
export const photos: readonly Photo[] = [...photoEntries].sort(
  (left, right) => left.sortOrder - right.sortOrder,
);
