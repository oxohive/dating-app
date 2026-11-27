import { Button } from "@/components/Button";

/**
 * Homepage hero section.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200 opacity-50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent-200 opacity-40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <span className="mb-6 inline-block rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-primary-600 shadow-sm ring-1 ring-primary-100">
          Now piloting in Chennai
        </span>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          Find real connections{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            in Chennai
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-600 sm:text-xl">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Meet
          verified singles near you.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="#">Get the app</Button>
        </div>
      </div>
    </section>
  );
}
