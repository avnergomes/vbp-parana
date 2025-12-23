import { Leaf, Github, ExternalLink, User } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-accent-200 bg-gradient-to-b from-neutral-50 to-accent-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Brand */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Leaf className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-dark-900 text-sm md:text-base">VBP Paraná</h3>
                <p className="text-[10px] md:text-xs text-dark-600">Inteligência Territorial</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-dark-700 leading-relaxed">
              Dashboard interativo para análise do Valor Bruto da Produção
              Agropecuária do estado do Paraná (2012-2024).
            </p>
          </div>

          {/* Data Sources */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="font-semibold text-dark-900 text-sm md:text-base">Fontes de Dados</h4>
            <ul className="space-y-2 text-xs md:text-sm text-dark-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                <span>Secretaria da Agricultura do Paraná (SEAB)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                <span>Instituto de Desenvolvimento Rural (IDR-Paraná)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                <span>IBGE - Malhas Municipais</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="font-semibold text-dark-900 text-sm md:text-base">Links</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <a
                  href="https://github.com/avnergomes/vbp-parana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-dark-700 hover:text-primary-600 transition-colors group"
                >
                  <Github className="w-4 h-4 flex-shrink-0" />
                  <span>Repositório no GitHub</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.idrparana.pr.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-dark-700 hover:text-primary-600 transition-colors group"
                >
                  <span>IDR-Paraná</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-accent-200 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-dark-600">
            <p>
              {currentYear} VBP Paraná. Dados públicos processados para fins analíticos.
            </p>
            <span className="hidden sm:inline text-accent-400">•</span>
            <a
              href="https://avnergomes.github.io/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-dark-500 hover:text-primary-600 transition-colors group"
              title="Desenvolvido por Avner Gomes"
            >
              <img src="/vbp-parana/assets/logo.png" alt="Avner Gomes" className="w-5 h-5 md:w-6 md:h-6 rounded-full opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] md:text-xs">Desenvolvido por Avner Gomes</span>
            </a>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-2">
            <span className="badge badge-green text-[10px] md:text-xs">13 anos de dados</span>
            <span className="badge badge-blue text-[10px] md:text-xs">399 municípios</span>
            <span className="badge badge-yellow text-[10px] md:text-xs">200+ produtos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
