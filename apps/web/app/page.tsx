"use client"

import dynamic from "next/dynamic"

const HomePage = dynamic(() =>
  import("../src/pages/home/ui/home-page").then((mod) => mod.HomePage),
  {
    ssr: false,
  },
)

export default function Page() {
  return (
    <HomePage />
  )
}
