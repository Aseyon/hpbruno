# eXit — versão web em português

Abra `hidden.html` por um servidor local (por exemplo, Live Server no VS Code).

## Imagens

Coloque na pasta `assets/`:

- eXit.png
- barrel.png
- move_barrel.png
- friend.png
- note.png
- light_note.png
- leave.png
- boat.png
- new_world.png

`note.png` é usada quando aparece a mensagem de que está escuro demais para ler a nota.
`light_note.png` só é usada depois do comando `acender um fósforo`.

## Comandos

Primeira tela, as duas rotas já estão disponíveis:

`mover o barril`

ou

`sentar ao lado do meu amigo`

Rota do barril:

`entrar no túnel` → `ler a nota` → `ir embora` → `olhar` → `entrar no barco`

Depois de `entrar no barco`:

`sim` para reiniciar.

Rota do amigo:

`sentar ao lado do meu amigo` → `acender um fósforo` → `ficar`

O parser aceita maiúsculas/minúsculas, acentos e algumas pequenas variações de digitação.

## Visual

O render usa baixa resolução, filtro de cor, scanlines, granulação discreta, curvatura CRT/olho de peixe suave, vinheta e chuvisco cinza animado separado da imagem.
