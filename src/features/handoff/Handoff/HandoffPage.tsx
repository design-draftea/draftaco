import { useState } from 'react'
import {
  CheckCircleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import './HandoffPage.css'

type HandoffScreenId = 'home' | 'sport' | 'championship' | 'event' | 'promotions' | 'casino'

const homeOrderItems = [
  {
    title: 'Topo',
    description: 'Header principal, trilho e mercados em comportamento sticky durante a navegação.',
  },
  {
    title: 'Trilho',
    description: 'Entrada rápida por destaques, esporte e competições relevantes para o momento.',
  },
  {
    title: 'Banner de destaque',
    description: 'Oferta principal da Home geral, com evento, mercado ou promoção de maior impacto.',
  },
  {
    title: 'Promoções',
    description: 'Bloco logo abaixo do banner principal com as ofertas esportivas mais relevantes do momento.',
  },
  {
    title: 'Conteúdo vivo e pré-jogo',
    description: 'Vitrine dos melhores eventos distribuídos nos campeonatos mais fortes para aquele momento.',
  },
]

const sportOrderItems = [
  {
    title: 'Ofertas imperdíveis',
    description: 'Mesmo bloco da Home, com combinadas, aumentadas e pechinchas filtradas por esporte.',
  },
  {
    title: 'Jogos em destaque',
    description: 'Lista curada dos melhores jogos daquele esporte, agrupada por campeonatos.',
  },
  {
    title: 'Mercados sticky',
    description: 'Tipos de mercado acompanham o scroll no topo para troca rápida de odds.',
  },
  {
    title: 'Ver campeonatos',
    description: 'Acesso para explorar todos os campeonatos do esporte pelo topo e pelo fim da lista.',
  },
]

const competitionOrderItems = [
  {
    title: 'Ao vivo',
    description: 'Primeiro bloco da competição, com todos os jogos ao vivo daquele campeonato.',
  },
  {
    title: 'Hoje',
    description: 'Segundo bloco, com todos os jogos pré-match que acontecem hoje.',
  },
  {
    title: 'Amanhã',
    description: 'Terceiro bloco, com todos os jogos pré-match do dia seguinte.',
  },
  {
    title: 'Ver campeonatos',
    description: 'Acesso no fim da tela para trocar rapidamente para outra competição do mesmo esporte.',
  },
]

const handoffScreens = [
  { id: 'home', label: 'Home apostas', isEnabled: true },
  { id: 'sport', label: 'Esporte', isEnabled: true },
  { id: 'championship', label: 'Competição', isEnabled: true },
  { id: 'event', label: 'Evento', isEnabled: false },
  { id: 'promotions', label: 'Promoções', isEnabled: false },
  { id: 'casino', label: 'Cassino', isEnabled: false },
] satisfies {
  id: HandoffScreenId
  label: string
  isEnabled: boolean
}[]

export function HandoffPage() {
  const [activeScreen, setActiveScreen] = useState<HandoffScreenId>('home')

  return (
    <main className="handoff-page">
      <header className="handoff-hero">
        <p className="handoff-hero__eyebrow">Handoff</p>
        <h1 className="handoff-hero__title">Handoff de produto</h1>
        <p className="handoff-hero__description">
          Um guia vivo para registrar decisões de produto, regras de comportamento e pontos de atenção das principais
          telas da experiência.
        </p>
      </header>

      <nav className="handoff-screen-tabs" aria-label="Telas do handoff">
        {handoffScreens.map((screen) => (
          <button
            className={[
              'handoff-screen-tabs__item',
              activeScreen === screen.id ? 'handoff-screen-tabs__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            key={screen.label}
            aria-pressed={activeScreen === screen.id}
            disabled={!screen.isEnabled}
            onClick={() => setActiveScreen(screen.id)}
          >
            {screen.label}
          </button>
        ))}
      </nav>

      {activeScreen === 'home' && (
        <>
      <section className="handoff-section" id="objetivo">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Visão geral</p>
          <h2>O papel da Home</h2>
        </div>
        <p className="handoff-lead">
          A Home deve concentrar o melhor que temos para o usuário apostar: um topo claro, um trilho contextual, um
          banner forte e uma vitrine curta de eventos com maior potencial. As interações principais atualizam o
          conteúdo da própria Home, sem exigir troca de página.
        </p>

        <div className="handoff-flow" aria-label="Ordem esperada da Home">
          {homeOrderItems.map((item, index) => (
            <article className="handoff-flow__item" key={item.title}>
              <span className="handoff-flow__index">{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="handoff-section" id="header">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Regra 01</p>
          <h2>Header fixo e troca de produto</h2>
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Header composto</h3>
            <p>
              O que permanece fixo não é só a barra principal. O conjunto de header principal, trilho e mercados deve
              funcionar em comportamento sticky durante o scroll.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Toggle Apostas/Cassino</h3>
            <p>
              O usuário pode alternar entre Apostas e Cassino a qualquer momento pelo toggle. A troca muda o contexto
              e atualiza trilho, banner e conteúdo abaixo.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Mercados sticky</h3>
            <p>
              Quando houver mercados no contexto ativo, eles acompanham o usuário no topo junto do header/trilho para
              manter comparação e seleção de odds acessíveis.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Saldo responsivo</h3>
            <p>
              A visualização do saldo se adapta ao espaço disponível. Em resoluções menores, o valor pode ser
              abreviado para preservar leitura e evitar quebra do header.
            </p>
          </div>
        </article>
      </section>

      <section className="handoff-section" id="trilho">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Regra 02</p>
          <h2>Trilho de esportes e competições</h2>
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Filtro de conteúdo</h3>
            <p>
              O trilho funciona como filtro da Home. Ao selecionar um esporte ou competição, não carregamos uma página
              nova; o conteúdo abaixo é atualizado dentro do mesmo contexto.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Agrupamento</h3>
            <p>
              O trilho pode misturar esportes e competições, mas cada competição deve ficar agrupada junto do esporte
              ao qual pertence.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Contexto</h3>
            <p>
              A competição sozinha perde contexto. O usuário precisa entender rapidamente que Brasileirão pertence a
              Futebol e NBA pertence a Basquete.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Relevância</h3>
            <p>
              A composição do trilho pode seguir uma estratégia de personalização por perfil ou privilegiar os esportes
              e competições mais fortes daquele momento. Em ambos os casos, o agrupamento por esporte deve ser mantido.
            </p>
          </div>
        </article>

        <div className="handoff-examples">
          <div className="handoff-example handoff-example--good">
            <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
            <div>
              <h3>Correto</h3>
              <p>Futebol, Brasileirão, Champions, Basquete, NBA, Tênis.</p>
            </div>
          </div>
          <div className="handoff-example handoff-example--bad">
            <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />
            <div>
              <h3>Evitar</h3>
              <p>Futebol, NBA, Champions, Basquete, Brasileirão.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="handoff-section" id="banner">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Regra 03</p>
          <h2>Banner de destaque</h2>
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Regra</h3>
            <p>
              O banner deve representar a melhor oportunidade da Home geral: ao vivo, evento forte de hoje, odd
              aumentada, super combo ou novidade relevante.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Comportamento por contexto</h3>
            <p>
              O banner de destaque deve aparecer apenas quando o trilho ativo for Destaques. Ao trocar para um esporte
              ou competição, o banner some e o conteúdo passa a focar diretamente naquele contexto.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Home apostas</h3>
            <p>
              Na Home apostas, o banner principal não deve trazer campanha, jogo, mecânica ou chamada relacionada a
              cassino. O destaque precisa permanecer dentro do contexto de apostas esportivas.
            </p>
          </div>
        </article>
      </section>

      <section className="handoff-section" id="promocoes">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Regra 04</p>
          <h2>Bloco de promoções</h2>
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Posição fixa</h3>
            <p>
              O bloco de promoções fica sempre logo abaixo do banner principal, antes das vitrines de eventos.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Curadoria</h3>
            <p>
              A Home apostas não precisa trazer todas as promoções. A seleção deve priorizar as ofertas de apostas
              esportivas mais relevantes para o momento.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Sem cassino</h3>
            <p>
              Promoções, missões ou chamadas relacionadas a cassino não devem aparecer nesse bloco quando o contexto
              ativo for Home apostas.
            </p>
          </div>
        </article>
      </section>

      <section className="handoff-section" id="conteudo">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Regra 05</p>
          <h2>Conteúdo</h2>
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Home geral</h3>
            <p>
              Depois do banner e do bloco de promoções, a Home deve priorizar os melhores eventos disponíveis,
              independentemente de serem ao vivo ou pré-jogo. O foco é qualidade e relevância, não apenas ordem
              temporal.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Campeonatos</h3>
            <p>
              A vitrine deve trazer cinco campeonatos relevantes: dois abertos para leitura imediata e três fechados
              para manter a página compacta.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Jogos por campeonato</h3>
            <p>
              Cada campeonato deve exibir no máximo três jogos. A seleção deve privilegiar os melhores eventos do
              campeonato, seja no ao vivo, seja no pré-match.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Ofertas imperdíveis</h3>
            <p>
              Por default, Ofertas imperdíveis fica entre Ao vivo e Começa em breve. Esse bloco deve reunir ofertas
              fortes como combinadas, odds aumentadas, pechinchas e outras mecânicas esportivas relevantes.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Ordem configurável</h3>
            <p>
              A ordem dos blocos da vitrine deve poder ser configurada por Ops ou automatizada por relevância,
              respeitando a estratégia definida para a Home apostas.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Relevância da vitrine</h3>
            <p>
              Os blocos Ao vivo e Começa em breve devem seguir uma estratégia definida: personalizar por perfil,
              histórico e interesse esperado, ou privilegiar os melhores eventos disponíveis naquele momento.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Tesouro do Pitaco</h3>
            <p>
              Ao final da Home, devemos trazer o tesouro acumulado do Tesouro do Pitaco, dando ao usuário uma entrada
              clara para abrir o baú.
            </p>
          </div>
        </article>

        <div className="handoff-priority">
          <span>Regra da vitrine</span>
          <ol>
            <li>5 campeonatos</li>
            <li>2 abertos</li>
            <li>3 fechados</li>
            <li>Até 3 jogos</li>
            <li>Melhores eventos</li>
            <li>Sem cassino</li>
            <li>Ofertas imperdíveis</li>
            <li>Ordem configurável</li>
            <li>Perfil ou momento</li>
            <li>Tesouro acumulado</li>
          </ol>
        </div>
      </section>
        </>
      )}

      {activeScreen === 'sport' && (
      <section className="handoff-section" id="esporte">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Tela</p>
          <h2>Esporte</h2>
        </div>
        <p className="handoff-lead">
          Ao selecionar um esporte no trilho, a Home não abre uma página nova. O contexto abaixo do header é
          atualizado para uma tela focada naquele esporte, sem banner principal e sem bloco de promoções da Home.
        </p>

        <div className="handoff-flow" aria-label="Ordem esperada da tela de esporte">
          {sportOrderItems.map((item, index) => (
            <article className="handoff-flow__item" key={item.title}>
              <span className="handoff-flow__index">{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Ofertas por esporte</h3>
            <p>
              A tela inicia com Ofertas imperdíveis. É o mesmo tipo de bloco usado na Home, mas as ofertas precisam
              estar atreladas ao esporte selecionado, incluindo combinadas, odds aumentadas, pechinchas e outras
              mecânicas esportivas relevantes.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Jogos em destaque</h3>
            <p>
              Depois das ofertas, a tela traz Jogos em destaque. A seleção deve ser curada: melhores campeonatos e
              melhores jogos para destacar, sem tentar listar todos os eventos disponíveis daquele esporte.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Mercados sticky</h3>
            <p>
              Os tipos de mercado de Jogos em destaque devem funcionar em comportamento sticky no topo durante o
              scroll, permitindo trocar o mercado sem perder o contexto da lista.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Campeonatos em acordeon</h3>
            <p>
              Os jogos devem ser separados por campeonato. Cada campeonato funciona como acordeon e todos devem iniciar
              abertos para leitura imediata dos destaques.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Ao vivo antes do pré-match</h3>
            <p>
              Dentro de um campeonato, jogos ao vivo aparecem acima dos jogos pré-match. Os jogos pré-match devem
              indicar se acontecem hoje ou amanhã.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Descoberta de campeonatos</h3>
            <p>
              O botão Ver campeonatos deve aparecer no título de Jogos em destaque e também no fim da listagem. No fim,
              ele serve como descoberta para quem rolou a tela e quer explorar todos os campeonatos do esporte.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Esportes no trilho</h3>
            <p>
              Quando um esporte for carregado pelo usuário e ainda não existir no trilho, ele deve ser adicionado no
              final da lista, sempre antes do botão Mais. Esses esportes entram de forma incremental durante a sessão,
              mas, ao fechar o app e carregar novamente, o trilho volta ao conjunto padrão de esportes.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Acesso por campeonato</h3>
            <p>
              Quando fizer sentido, cada bloco de campeonato pode ter uma chamada para ver mais daquele campeonato,
              mantendo o usuário dentro do esporte selecionado e aprofundando a navegação por competição.
            </p>
          </div>
        </article>

        <div className="handoff-priority">
          <span>Regra da tela de esporte</span>
          <ol>
            <li>Ofertas filtradas por esporte</li>
            <li>Jogos em destaque curados</li>
            <li>Campeonatos em acordeon aberto</li>
            <li>Ao vivo antes do pré-match</li>
            <li>Pré-match hoje ou amanhã</li>
            <li>Mercados sticky</li>
            <li>Ver campeonatos no topo e no fim</li>
            <li>Esportes adicionados antes do Mais</li>
            <li>Reset do trilho ao reabrir o app</li>
          </ol>
        </div>
      </section>
      )}

      {activeScreen === 'championship' && (
      <section className="handoff-section" id="competicao">
        <div className="handoff-section__header">
          <p className="handoff-section__eyebrow">Tela</p>
          <h2>Competição</h2>
        </div>
        <p className="handoff-lead">
          Ao acessar uma competição, o conteúdo deve ficar totalmente focado naquele campeonato e no esporte ao qual ele
          pertence. Como a página já é enxuta, a regra aqui é listar todos os jogos disponíveis nos blocos Ao vivo,
          Hoje e Amanhã.
        </p>

        <div className="handoff-flow" aria-label="Ordem esperada da tela de competição">
          {competitionOrderItems.map((item, index) => (
            <article className="handoff-flow__item" key={item.title}>
              <span className="handoff-flow__index">{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="handoff-rule">
          <div className="handoff-rule__content">
            <h3>Três blocos fixos</h3>
            <p>
              A competição deve priorizar sempre três seções: Ao vivo, Hoje e Amanhã. Essa estrutura organiza a leitura
              por status e proximidade sem misturar a intenção de cada bloco.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Listagem completa</h3>
            <p>
              Diferente da tela de esporte, a competição não precisa ser curada. Devemos trazer todos os jogos ao vivo,
              todos os jogos de hoje e todos os jogos de amanhã daquele campeonato.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Mercados sticky</h3>
            <p>
              Os chips de mercado ficam fixos no topo durante o scroll, seguindo o mesmo comportamento da tela de
              esporte para manter a troca de mercado acessível.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Ver campeonatos</h3>
            <p>
              No final da tela, o botão Ver campeonatos permite trocar rapidamente para outra competição do esporte
              selecionado.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Competição fora do trilho</h3>
            <p>
              Se o usuário acessar uma competição que ainda não está no trilho, ela deve ser adicionada no final da
              lista, antes do botão Mais, mas sempre dentro do bloco do esporte ao qual pertence.
            </p>
          </div>
          <div className="handoff-rule__content">
            <h3>Vínculo com esporte</h3>
            <p>
              A competição nunca deve aparecer solta no trilho. Mesmo quando adicionada dinamicamente, ela precisa
              manter o contexto do esporte pai, como Futebol, Basquete ou Tênis.
            </p>
          </div>
        </article>

        <div className="handoff-priority">
          <span>Regra da competição</span>
          <ol>
            <li>Ao vivo</li>
            <li>Hoje</li>
            <li>Amanhã</li>
            <li>Todos os jogos do campeonato</li>
            <li>Mercados sticky</li>
            <li>Ver campeonatos no final</li>
            <li>Competição dinâmica antes do Mais</li>
            <li>Sempre dentro do esporte pai</li>
          </ol>
        </div>
      </section>
      )}
    </main>
  )
}
