# unshit-my-repo 💩🔧

> CLI que ajuda devs a desfazer erros comuns no Git — sem precisar lembrar de nenhum comando.

---

## Instalação e uso

Sem instalar nada:

```bash
npx unshit-my-repo
```

Ou instale globalmente para usar com o atalho `unshit`:

```bash
npm install -g unshit-my-repo
unshit
```

---

## O que ele resolve

```
😬 O que aconteceu?

1. Fiz um commit errado
2. Fiz um push errado
3. Quero voltar para um commit antigo
4. Deletei uma branch sem querer
5. Não sei o que fiz 😭
```

Cada opção guia você pelo processo com linguagem simples, sem termos técnicos, e sempre com uma confirmação antes de qualquer ação destrutiva.

---

## Segurança

- Cria uma branch de backup antes de qualquer operação (`backup-before-unshit-<timestamp>`)
- Exige confirmação explícita para ações que apagam dados
- Nunca assume contexto — sempre explica o que vai acontecer antes de agir

---

## Requisitos

- Node.js 14+
- Git instalado e disponível no PATH

---

## Autor

**V2HM** — [grupov2hm@gmail.com](mailto:grupov2hm@gmail.com)

## Licença

MIT
