import PropTypes from 'prop-types';

export default function Footer({ data }) {
  if (!data) return null;
  return (
    <footer className="bg-slate-950 w-full py-12">
      <div className="flex flex-col items-center gap-8 w-full px-4">
        <div className="text-lg font-serif text-slate-200">MUJDE DOENYAS</div>
        <div className="flex gap-8 md:gap-12">
          {data.links.map((link, idx) => (
            <a 
              key={idx}
              href={link.url}
              target={link.url.startsWith('http') ? '_blank' : undefined}
              rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-slate-500 hover:text-primary transition-colors font-sans uppercase tracking-[0.2em] text-[10px]"
            >
              {link.name}
            </a>
          ))}
        </div>
        <div className="text-slate-400 font-sans uppercase tracking-[0.2em] text-[10px]">
          {data.copyright}
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  data: PropTypes.shape({
    links: PropTypes.arrayOf(PropTypes.shape({
      url: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })).isRequired,
    copyright: PropTypes.string.isRequired,
  }),
};
