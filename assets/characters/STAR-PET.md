# ほしもち素材

Commetの試作キャラ。添付の4表情イラストを参照し、内蔵のImageGenで透過PNGを生成しました。歩行のコマと頭の装着点は `extension/ui/StarPet.tsx` にあります。ミントもちと夜空もちは、本体の明るい部分を描画時に着色します。帽子のPNGは別レイヤーです。

## 生成時のプロンプト

### star-expressions.png

Use case: identity-preserve. Asset type: production 2 by 2 expression sprite sheet for Commet. Input Image 1: exact character identity and finish reference. The Commet mascot has a soft white bell-shaped body with a scalloped hem, tiny oval arms, small black oval eyes, a tiny w mouth, pink cheeks, a smooth pinkish-white body with subtle gloss, warm dark chocolate outlines, and exactly two faceted lilac stalks with gold stars. Preserve the reference's soft pastel 2D sticker art and geometry; no redesign, no pixelization, no outlines changing between frames. Use genuinely transparent RGBA background, no paper, no shadow underneath, no captions, no text, no borders or divider lines. Square image divided into four exact equal quadrants, artwork fully inside each quadrant with equal padding and enough top clearance for a hat, same scale and ground line relative to each quadrant. Top left: reference normal expression and pose. Top right: reference joyful closed smiling eyes, open pink mouth and little yellow rays. Bottom left: reference sad expression, eyes bent inward, two blue tears. Bottom right: reference learning pose, holding the purple book with yellow planet and a small floating lightbulb. All four figures are fully visible, matching each other and the reference. Maintain near-identical head top height and head x center in each cell, even for learning. No extra props or characters.

### star-walk.png

Use case: identity-preserve. Asset type: production six-frame sprite sheet for Commet's walk loop. Input Image 1: exact character identity and finish reference. The Commet mascot has a soft white bell-shaped body with a scalloped hem, tiny oval arms, small black oval eyes, a tiny w mouth, pink cheeks, a smooth pinkish-white body with subtle gloss, warm dark chocolate outlines, and exactly two faceted lilac stalks with gold stars. Preserve the reference's soft pastel 2D sticker art and geometry; no redesign, no pixelization, no outlines changing between frames. Use genuinely transparent RGBA background, no paper, no shadow underneath, no captions, no text, no borders or divider lines. Exactly six poses in a 3-column 2-row rectangular contact sheet, evenly spaced in equal square cells, ordered left-to-right then top-to-bottom. Each cell is a full mascot with same rightward three-quarter facing angle (subtle, both eyes visible), normal small w mouth, same body size, center, star stalks, right-facing direction, and matching baseline relative to its cell. Make a gentle in-place walk using the body hem, with alternating pushes, not legs: frame 1 right hem stretches forward, frame 2 settle and squat lightly, frame 3 straighten and lift left rear hem, frame 4 opposite scallop stretches forward, frame 5 settle and squat lightly, frame 6 straighten and lift right rear hem. Alternate arm swing subtly; make poses visibly different but keep face and identity exactly consistent. Keep each sprite wholly within its own cell with wide transparent gutters. No hats, no books, no footsteps or motion lines.

### star-beret.png

Use case: illustration-story. Asset type: one detached game wearable for the referenced Commet mascot. Input Image 1: style reference, do not depict its character. Draw ONLY a small purple tilted beret, front view, low and wide profile, tiny curled top stem, warm chocolate outline and pastel lilac shading matching the mascot. The bottom edge has a slight curve for the top of a rounded head. Single object centered, fills canvas with margins, transparent RGBA, no head, no characters, no text, no shadow.

### star-pin.png

Use case: illustration-story. Asset type: one detached game wearable for the referenced Commet mascot. Input Image 1: style reference, do not depict its character. Draw ONLY one cute tiny blue star hairpin: a single five-point icy pastel-blue star with subtle gem facets, fitted on a short diagonal lilac clip. Warm chocolate outline and smooth pastel sticker art matching the reference. Single object centered, large in canvas, fully visible with margins. Transparent RGBA, no head, no characters, no text, no shadow.

## レイヤー分離版

- `star-body-poses.png` と `star-body-walk.png` は顔や装備を外した本体です。
- `star-book.png` は学習時の手持ちアイテムです。既存の帽子PNGと同じく、本体の外に描画します。
- 目、口、頬、頭の飾り、体の柄、表情エフェクトは `extension/ui/star-parts.tsx` にあるSVGパーツです。歩行時も本体のコマと同じ頭の基準位置に追従します。現在の表示は淡い頬の赤みを重ね、足元を基準に縦方向を89%に縮めています。
- 旧表情シートのノーマルは「以前のノーマルと比較」に使用します。

### 内蔵ImageGenで使った追加プロンプト

#### [star-body-poses.png](star-body-poses.png)

Use case: precise-object-edit. Image 1: existing 2-by-2 Commet sprite sheet, edit target. Make a BODY-ONLY layer. Keep the exact silhouette, scalloped skirt, arm shapes/poses, light pink-ivory body with glossy highlights, dark cocoa line art, soft 2D sticker style, individual scaling and positions. Transparent RGBA outside silhouettes, no shadows or colored haze. Preserve the exact 2x2 frame layout and framing. Remove all eyes, mouths, eyebrows, cheeks, tears, yellow rays, purple marks, lightbulb, purple book and book stack, and BOTH gold stars and their lilac stems. The area under each face and book must be smoothly repaired to match the existing pink-white body. Keep the exact head outline under the stalks and all four scalloped hems. Keep idle arms raised near cheeks, joyful arms lifted, sad arms curled low. In lower right remove the book and its two foreground hand ovals leaving the simple body with no crossing hands; its hands and book will be added separately. Four sprites only; no icons, text, outlines in the blank face, or extra decoration.

#### [star-body-walk.png](star-body-walk.png)

Use case: precise-object-edit. Image 1: original six-frame Commet walking sprite sheet, edit target. Make a BODY-ONLY layer. Keep the exact silhouette, scalloped skirt, arm shapes/poses, light pink-ivory body with glossy highlights, dark cocoa line art, soft 2D sticker style, individual scaling and positions. Transparent RGBA outside silhouettes, no shadows or colored haze. Keep the exact 3-column by 2-row layout of SIX complete sprites all facing three-quarter right. Preserve arm swings, all scallops, size, stance and y registration. Remove all eyes, mouths and pink cheeks. Remove BOTH stars and their lilac stalks entirely from every sprite, and restore the dome outline continuously where the stalks attached. Keep the highlights on the upper left of the head and the peach shading. Smooth faceless bodies only. True transparent alpha outside, no frame borders or captions.

#### [star-book.png](star-book.png)

Use case: precise-object-edit. Image 1: reference from Commet. Extract ONLY the single opened purple book from the lower-right pose as a detached overlay prop. Preserve the warm chocolate outlines, pastel purple covers, clear white pages, little white sparkles and yellow-ringed pale lilac planet. Reconstruct its left and right edges where the mascot holds it. Use the same straight-on slightly tilted open book composition. Show no hands or character, no lightbulb, no extra books, no shadow, no text. One isolated book, centered with small transparent RGBA margins. The asset must be usable as a layered prop on top of the mascot.
