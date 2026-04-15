function HeroSection({ children }) {
  return (
    <section className="hero">
      <p className="eyebrow">Meal Recipe Finder</p>
      <h1>Find meals, open recipes, and explore random dishes.</h1>
      <p className="hero-copy">
        Search TheMealDB, inspect ingredients, and jump straight into detailed instructions.
      </p>
      {children}
    </section>
  );
}

export default HeroSection;