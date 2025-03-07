// Brands.tsx
import React, { useState } from "react";
import Navbar from "../components/navbar";
import { Link } from "react-router-dom";
import styled from "styled-components";

//fix later -> add to db 
const brands = ["A. Lange & Söhne", "Accutron", "Aerowatch", "Aigle", "Aigner", "Alain Silberstein", "Alexander Shorokhoff", "Alfred Dunhill", "Alfred Rochat & Fils", "Alpina", "Andersen Genève", "Andreas Strehler", "Angelus", "Angular Momentum", "Anonimo", "Apple", "Aquanautic", "Aquastar", "Aristo", "Armand Nicolet", "Armani", "Armin Strom", "Arnold & Son", "Artisanal", "Artya", "Askania", "Ateliers deMonaco", "Atlantic", "Audemars Piguet", "Auguste Reymond", "Auricoste", "Avier", "Azimuth", "Azzaro", "B.R.M", "Ball", "Balmain", "Baltic", "Barington", "Baume & Mercier", "Bedat & Co", "Behrens", "Bell & Ross", "Benrus", "Benzinger", "Berne", "Bertolucci", "Beuchat", "Bifora", "Black-Out Concept", "Blacksand", "Blancier", "Blancpain", "blu", "Boegli", "Bogner Time", "Boldr", "Bomberg", "Borgeaud", "Boucheron", "Bovet", "Breguet", "Breil", "Breitling", "Bremont", "Brior", "Bruno Söhnle", "Bulgari", "Bulova", "Bunz", "Burberry", "BWC-Swiss", "C.H. Wolf", "Cabestan", "Cadet Chronostar", "Camille Fournet", "Candino", "Carl F. Bucherer", "Carlo Ferrara", "Carlo Maroni", "Cartier", "Casio", "Catamaran", "Catena", "Catorex", "Cattin", "Century", "Cerruti", "Certina", "Chanel", "Charmex", "Charriol", "Chase-Durer", "Chaumet", "Chopard", "Chris Benz", "Christiaan v.d. Klaauw", "Christofle", "Christophe Claret", "Christopher Ward", "Chronographe Suisse Cie", "Chronoswiss", "Churpfälzische Uhrenmanufaktur", "Citizen", "ck Calvin Klein", "Claude Bernard", "Claude Meylan", "Clerc", "Concord", "Condor", "Cornehl", "Cornelius & Cie", "Cortébert", "Corum", "Creo", "Crockett & Jones", "Cronus", "Cuervo y Sobrinos", "Cvstos", "CWC", "Cyclos", "Cyma", "Cyrus", "Czapek", "D. Dornblüth & Sohn", "Damasko", "Daniel Roth", "Dark Rush", "Davidoff", "Davosa", "De Bethune", "Decade", "Deep Blue", "De Grisogono", "DeLaCour", "DeLaneau", "Delma", "Devon", "Dewitt", "Diesel", "Dietrich", "Dior", "Dodane", "Dolce & Gabbana", "Dom Baiz International", "Doxa", "Dubey & Schaldenbrand", "DuBois 1785", "DuBois et fils", "Dufeau", "Dugena", "Dürmeister", "Ebel", "Eberhard & Co.", "Edox", "Egotempo", "Eichmüller", "El Charro", "Election", "Elgin", "Elysee", "Engelhardt", "Enicar", "Ennebi", "Epos", "Ernest Borel", "Ernst Benz", "Erwin Sattler", "Esprit", "Eterna", "Eulit", "Eulux", "F.P. Journe", "Fabergé", "Favre-Leuba", "Feldo", "Fendi", "Festina", "Fiorucci", "Flik Flak", "Fluco", "Fludo", "Formex", "Fortis", "Forum", "Fossil", "Franck Dubarry", "Franck Muller", "Franc Vila", "Frederique Constant", "Furlan Marri", "Gaga Milano", "Gallet", "Gant", "Gardé", "Garmin", "Georges V", "Gerald Charles", "Gérald Genta", "Germano & Walter", "Gevril", "Gigandet", "Girard Perregaux", "Giuliano Mazzuoli", "Glashütte Original", "Glycine", "Graf", "Graham", "Grand Seiko", "Greubel Forsey", "Grönefeld", "Grovana", "Gruen", "Gübelin", "GUB Glashütte", "Gucci", "Guess", "Gul Watches", "Guy Laroche", "H.I.D. Watch", "H. Moser & Cie.", "Habring²", "Hacher", "Haemmer", "Hagal", "Hamilton", "Hanhart", "Harry Winston", "Hautlence", "HD3", "Hebdomas", "Hebe", "Helvetia", "Hentschel Hamburg", "Hermès", "Herzog", "Heuer", "Hirsch", "Hublot", "Hugo Boss", "HYT", "M.A.D. Editions", "M&M Swiss Watch", "Marburger", "Marcello C.", "Margi", "Marlboro", "Martin Braun", "Marvin", "Maserati", "Mathey-Tissot", "Mauboussin", "Maurice Blum", "Maurice de Mauriac", "Maurice Lacroix", "MB&F", "Meccaniche Veloci", "Meistersinger", "Mercure", "Mercury", "Meva", "MEXX Time", "Meyers", "Michael Bittel", "Michael Kors", "Michele", "Michel Herbelin", "Michel Jordi", "Mido", "Milleret", "Milus", "Minerva", "Ming", "Momentum", "Momo Design", "Mondaine", "Mondia", "Montano", "Montblanc", "Montega", "Morellato", "Moritz Grossmann", "Movado", "Mühle Glashütte", "N.B. Yäeger", "N.O.A", "Naj-Oleari", "Nautica", "Nauticfish", "Nethuns", "Nike", "Nina Ricci", "Nivada", "Nivrel", "Nixon", "NOMOS", "Norqain", "Nouvelle Horlogerie Calabrese (NHC)", "ODM", "Officina del Tempo", "Offshore Limited", "Ollech & Wajs", "Omega", "Orator", "Orbita", "Orfina", "Orient", "Oris", "Otumm", "Out of Order", "Pacardt", "Panerai", "Parmigiani Fleurier", "Patek Philippe", "Paul Picot", "Pequignet", "Perigáum", "Perrelet", "Perseo", "Phantoms", "Philip Stein", "Philip Watch", "Piaget", "Pierre Balmain", "Pierre Cardin", "Pierre DeRoche", "Pierre Kunz", "Police", "Poljot", "Porsche Design", "Preisig Schaffhausen", "Prim", "Pro-Hunter", "Pryngeps", "Pulsar", "Puma", "Quinting", "Rado", "Raidillon", "Rainer Brand", "Rainer Nienaber", "Raketa", "Ralf Tech", "Ralph Lauren", "Raymond Weil", "Rebellion", "Record", "REC Watches", "René Mouris", "Ressence", "Revue Thommen", "RGM", "Richard Mille", "Rios1931", "Roamer", "Roger Dubuis", "Rolex", "Rolf Lang", "Romain Jerome", "Rotary", "Rothenschild", "ROWI", "RSW", "Ryser Kentfield", "S. Oliver", "S.T. Dupont", "Salvatore Ferragamo", "Sandoz", "Sarcar", "Scalfaro", "Schäuble & Söhne", "Schaumburg", "Schwarz Etienne", "Sea-God", "Sea-Gull", "Sector", "Seiko", "Sekford", "Sevenfriday", "Shinola", "Sicura", "Sinn", "Skagen", "Slava", "Snyper", "Sothis", "Speake-Marin", "Spinnaker", "Squale", "St. Gallen", "Starkiin", "Steelcraft", "Steinhart", "Stowa", "Strom", "Stuhrling", "Swatch", "Swiss Military", "TAG Heuer", "Tavannes", "TB Buti", "Technomarine", "Technos", "Tecnotempo", "Temption", "Tempvs Compvtare", "Tendence", "Terra Cielo Mare", "Theorein", "Thomas Ninchritz", "Thorr", "Tiffany", "Timberland Watches", "Timex", "Tissot", "Titus", "Tokyo Flash", "Tommy Hilfiger", "Tonino Lamborghini", "Torrini", "Traser", "Tudor", "Tutima", "TW Steel", "Ublast", "U-Boat", "Ulysse Nardin", "Unikatuhren", "Union Glashütte", "Universal Genève", "Urban Jürgensen", "Urwerk", "Vacheron Constantin", "Valbray", "Valentino", "Van Cleef & Arpels", "Van Der Bauwede", "Vangarde", "Venezianico", "Ventura", "Versace", "Vianney Halter", "Viceroy", "Victorinox Swiss Army", "Vigoria Miletto", "Villemont", "Vincent Calabrese", "Visconti", "Vixa", "Vogard", "Vollmer", "Volna", "Von Wangenheim", "Vostok", "Voutilainen", "Vulcain", "Wakmann", "Waltham", "Welder", "Wempe", "Wenger", "Werenbach", "Wittnauer", "Wyler", "Wyler Vetta", "Xemex", "Xetum", "Yantar", "Yema", "Yes Watch", "Yves Saint Laurent", "Zeitwinkel", "Zelos", "Zenith", "Zeno-Watch Basel", "ZentRa", "Zeppelin", "Zodiac", "ZRC"]

const Brands: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBrands = brands.filter(brand =>
    brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBrands = filteredBrands.reduce((acc, brand) => {
    const firstLetter = brand.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(brand);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <>
      <Navbar />
      <Container>
        <Title>Luxury Watch Brands</Title>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        {Object.entries(groupedBrands).sort().map(([letter, brandsList]) => (
          <BrandsSection key={letter}>
            <AlphabetLetter>{letter}</AlphabetLetter>
            <BrandsList>
              {brandsList.map((brand) => (
                <BrandLink key={brand} to={`/brand/${brand.toLowerCase()}`}>
                  {brand}
                </BrandLink>
              ))}
            </BrandsList>
          </BrandsSection>
        ))}
      </Container>
    </>
  );
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: #14213D;
  text-align: center;
  margin: 2rem 0 3rem;
  font-weight: 300;
  letter-spacing: 2px;
`;

const BrandsSection = styled.div`
  margin: 2rem 0;
`;

const AlphabetLetter = styled.h2`
  font-size: 2rem;
  color: #14213D;
  border-bottom: 2px solid #C9A959;
  padding-bottom: 0.5rem;
  margin: 2rem 0 1rem;
  font-weight: 500;
`;

const BrandsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
`;

const BrandLink = styled(Link)`
  color: #2C446E;
  text-decoration: none;
  padding: 0.75rem;
  transition: all 0.2s ease;
  border-radius: 4px;
  
  &:hover {
    color: #C9A959;
    background-color: #F5F5F5;
    transform: translateX(5px);
  }
`;

const SearchContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 500px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 2px solid #E5E5E5;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #C9A959;
  }

  &::placeholder {
    color: #999;
  }
`;

export default Brands;
