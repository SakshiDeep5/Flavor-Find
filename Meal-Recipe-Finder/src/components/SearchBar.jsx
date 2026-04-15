function SearchBar({ searchText, onSearchTextChange, onSubmit, onRandom, isLoading }) {
  return (
    <form className="search-bar" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="search">
        Search for meals
      </label>
      <input
        id="search"
        type="text"
        placeholder="Search for meals or keywords"
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
      <button type="submit" disabled={isLoading}>
        Search
      </button>
      <button type="button" className="secondary" onClick={onRandom} disabled={isLoading}>
        Random meal
      </button>
    </form>
  );
}

export default SearchBar;