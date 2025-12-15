import { Leaf, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-earth-200 bg-gradient-to-b from-white to-earth-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-forest-100 rounded-xl">
                <Leaf className="w-6 h-6 text-forest-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-earth-900">VBP Paraná</h3>
                <p className="text-xs text-earth-500">Inteligência Territorial</p>
              </div>
            </div>
            <p className="text-sm text-earth-600 leading-relaxed">
              Dashboard interativo para análise do Valor Bruto da Produção
              Agropecuária do estado do Paraná (2012-2024).
            </p>
          </div>

          {/* Data Sources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-earth-900">Fontes de Dados</h4>
            <ul className="space-y-2 text-sm text-earth-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest-500 rounded-full" />
                Secretaria da Agricultura do Paraná (SEAB)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest-500 rounded-full" />
                Instituto de Desenvolvimento Rural (IDR-Paraná)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest-500 rounded-full" />
                IBGE - Malhas Municipais
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-earth-900">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/avnergomes/vbp-parana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-earth-600 hover:text-forest-600 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Repositório no GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.idrparana.pr.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-earth-600 hover:text-forest-600 transition-colors"
                >
                  IDR-Paraná
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-earth-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-earth-500">
            {currentYear} VBP Paraná. Dados públicos processados para fins analíticos.
          </p>
          <div className="flex items-center gap-4">
            <span className="badge badge-green">13 anos de dados</span>
            <span className="badge badge-blue">399 municípios</span>
            <span className="badge badge-yellow">200+ produtos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
