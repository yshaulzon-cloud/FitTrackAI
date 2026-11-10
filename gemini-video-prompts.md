# Areto — פרומפטים לסרטוני תרגילים ב-Gemini

פרומפט מוכן להדבקה לכל אחד מ-43 התרגילים (מסמך מרכזי; תיקיות התרגילים נוצרות בהדרגה).
הפרומפטים בנויים לפי תבנית שנבדקה מול ביקורת מקצועית (Veo prompt engineering): שכבת עקביות, מצלמה, תנועה, תזמון ולופ.
ברירת המחדל: **חזרה אחת של 6 שניות** לכל סרטון (קל יותר ללופ חלק). בלי נשימה, בלי הבעות פנים ובלי ספירת אצבעות, כי הן רק מעוותות את האיור.

## איך יוצרים כל סרטון

לכל תרגיל יש תיקייה ב-`פרויקט סרטוני תרגילים/` (שם התיקייה: מספר + שם התרגיל) ובה:

- `prompt.txt` — הפרומפט להדבקה
- `<slug>.png` — התמונה לצירוף
- `<slug>.mp4` — הסרטון הסופי (אני יוצר אותו אחרי העיבוד)

1. ב-Gemini לבחור **יצירת וידאו** (Video / Veo).
2. **לצרף את התמונה** מהתיקייה (היא הפריים הראשון ושומרת על הדמות והסגנון).
3. להדביק את התוכן של `prompt.txt` ולשלוח.
4. לבדוק את התוצאה מול הרשימה למטה; אם משהו לא תקין, ליצור מחדש.
5. להוריד ולשמור בתיקייה `_הורדות מגמיני - לשים כאן` (אפשר בכל שם), ואני אזהה, אשנה שם ואעבד.

אחרי זה אני מעבד (חיתוך לריבוע, לופ חלק, בלי אודיו, דחיסה) ושומר `<slug>.mp4` בתיקיית התרגיל.

## אם יש שדה "Negative prompt" נפרד (לא חובה, לבדוק עם ובלי)

```
3D rendering, photorealism, camera movement, perspective change, extra limbs, anatomy deformation, equipment deformation, character redesign, flicker, captions, logos
```

## בדיקת איכות לכל סרטון (לפסול אם אחד מאלה קורה)

- הדמות משתנה (פנים, שיער, בגדים, צבעים) או שהסגנון הופך לתלת-ממד/צילום
- המצלמה זזה, עושה זום או חותכת
- מוט מתעקם, משקולות משנות גודל או מספר, ידיים נמסות לתוך הציוד
- איברים נוספים או חסרים, מפרקים שמתכופפים לכיוון לא טבעי
- טכניקה שגויה (גב מעוגל בדדליפט, שורש כף יד כפוף לאחור בלחיצות, תנופה בכפיפות)
- הפריים האחרון רחוק מהראשון (הלופ יקפוץ)

## סדר תיקון אם סרטון נכשל

1. תיקון תיאור התנועה (פשוט יותר, מפרקים ברורים). אם הציוד או הידיים נשברים, לבדוק גם את התמונה עצמה.
2. פחות תנועה: חזרה אחת בלבד, בלי עצירות.
3. לחזק רק את האילוץ שנכשל. לא להוסיף אילוצים לא קשורים.
4. את הלופ מתקנים בעריכה (אני עושה את זה), לא בפרומפט.

---

## 1. bench-press — לחיצת חזה שטוח

תמונה להעלאה: `תמונות תרגילים 1/bench-press.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, lying on the flat bench with the barbell lowered to mid-chest. Perform one controlled repetition: press the bar upward and slightly toward the shoulder line until the elbows are nearly extended, then lower it smoothly along the reverse path back to mid-chest.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Head, torso and feet stay planted on the bench and floor, wrists stay aligned with the forearms, and both hands grip the same points on the bar. Movement comes from natural shoulder and elbow articulation. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds pressing upward and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 2. barbell-row — חתירה במוט

תמונה להעלאה: `תמונות תרגילים 1/barbell-row.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: hips hinged forward about 45 degrees, back flat, arms straight with the barbell hanging in front of the upper thighs. Row the bar up to the lower abdomen with the elbows driving back past the ribs, then lower it back to the hanging position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Torso angle, knees and feet stay fixed with a flat neutral back; only the arms and shoulders move. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rowing and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 3. overhead-press — לחיצת כתפיים

תמונה להעלאה: `תמונות תרגילים 1/overhead-press.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the bar pressed overhead. Lower the bar in front of the face to collarbone height, then press it straight back up to overhead lockout.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Legs, hips and torso stay upright and still with no back arch, and the wrists stay straight under the bar. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pressing. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 4. pull-ups — מתח

תמונה להעלאה: `תמונות תרגילים 1/pull-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: hanging from the bar with the elbows bent and the head below the bar. Pull the whole body straight up, driving the elbows down to the sides, until the chin rises clearly above the bar, then lower slowly back down to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Both hands stay gripped on the bar in the same place and the bar never moves. The legs stay straight and still with crossed ankles, the feet lift off the floor line as the body rises, and the body moves straight up and down as one unit without swinging. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about two seconds pulling up, a one-second pause with the chin above the bar, and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 5. bicep-curl — כפיפת מרפק

תמונה להעלאה: `תמונות תרגילים 1/bicep-curl.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: one arm curled with its dumbbell at shoulder height, the other arm hanging straight with its dumbbell beside the thigh. Alternate the arms: the curled dumbbell lowers slowly to the thigh while, at the same time, the hanging dumbbell curls up to shoulder height with the palm facing up; then reverse back to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Only the forearms move, hinging at the elbows; the elbows stay pinned to the sides, and the torso, head and legs stay still. Each dumbbell stays a rigid object held firmly in the fist, its handle stays horizontal, and it never spins, flips or rotates in the hand. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete alternation over six seconds: two smooth arm swaps of about three seconds each, ending in the starting arm positions. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 6. tricep-pushdown — פשיטת מרפק בכבל

תמונה להעלאה: `תמונות תרגילים 1/tricep-pushdown.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the arms fully extended and the bar pushed down in front of the thighs. Let the bar rise until the elbows bend to about 90 degrees and the forearms are level, then push it back down to full extension.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Only the forearms move, hinging at the elbows; the elbows stay pinned at the sides, the upper arms stay still, the torso stays upright, and the cable stays straight and taut from the pulley to the bar. The cable machine does not move. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds pushing down. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 7. incline-db-press — לחיצת חזה משופע דמבלים

תמונה להעלאה: `תמונות תרגילים 1/incline-db-press.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the dumbbells pressed up over the upper chest. Lower both dumbbells to the sides of the upper chest, then press them back up to near lockout.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Back and head stay on the incline pad, feet stay planted, and the wrists stay aligned with the forearms. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pressing. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 8. lateral-raise — הרמה צדדית

תמונה להעלאה: `תמונות תרגילים 1/lateral-raise.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with both arms raised to shoulder height in a T. Lower the dumbbells slowly to the sides of the thighs, then raise them back out to shoulder height.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The torso stays upright and still, the slight elbow bend stays constant, and the wrists stay neutral. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds raising. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 9. cable-row — חתירה בכבל

תמונה להעלאה: `תמונות תרגילים 1/cable-row.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the handle pulled to the abdomen. Let the arms extend forward until straight, then row the handle back to the abdomen with the shoulder blades squeezing together.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. He stays seated on the bench, the torso stays tall and still, the knees stay softly bent with the feet on the footplate, the cable stays straight and taut, and the machine does not move. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds extending and three seconds rowing. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 10. pec-fly — פרפר מכונה

תמונה להעלאה: `תמונות תרגילים 1/pec-fly.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, seated on the pec-deck machine with the arms opened wide, each hand gripping a vertical handle. Bring both handles together in front of the chest in a wide arc until they nearly touch, then open them back out to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The back stays against the pad, the feet stay on the floor, the soft elbow bend stays constant, the hands never let go of the handles, and the machine frame stays rigid while only its two arms swing. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds closing and three seconds opening. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 11. rear-delt-fly — הרמה אחורית

תמונה להעלאה: `תמונות תרגילים 1/rear-delt-fly.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, hinged forward with the arms raised out to the sides. Lower the dumbbells until the arms hang down, then raise them back out to the sides in a wide arc with a soft elbow bend.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The hip-hinged torso, flat back and soft knees stay still. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds raising. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 12. hammer-curl — כפיפה בפטיש

תמונה להעלאה: `תמונות תרגילים 1/hammer-curl.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: one arm curled with its dumbbell at shoulder height in a neutral grip, the other arm hanging straight with its dumbbell beside the thigh. Alternate the arms with the palms facing each other the whole time: the curled dumbbell lowers slowly to the thigh while, at the same time, the hanging dumbbell curls up to shoulder height; then reverse back to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Only the forearms move, hinging at the elbows; the elbows stay pinned to the sides, and the torso, head and legs stay still. Each dumbbell stays a rigid object held firmly in the fist and never spins, flips or rotates in the hand. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete alternation over six seconds: two smooth arm swaps of about three seconds each, ending in the starting arm positions. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 13. squat — סקוואט

תמונה להעלאה: `תמונות תרגילים 1/squat.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated deep squat with the bar on the upper back. Rise to standing with hips and knees extended, then lower back to the same depth with the hips just below knee level.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The bar stays level and straight across the upper back, feet stay flat and planted, knees track over the toes, and the chest stays up with a neutral spine. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 14. romanian-deadlift — דדליפט רומני

תמונה להעלאה: `תמונות תרגילים 1/romanian-deadlift.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: hips pushed back, torso leaning forward with a flat back, knees softly bent, and the bar hanging just above the knees. Stand up by driving the hips forward until upright with the bar at the upper thighs, then push the hips back again until the bar returns to just above the knees.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The back stays flat, arms stay straight, the bar stays close to the legs, and the knees keep a soft bend with feet planted. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds hinging back down. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 15. leg-press — לחיצת רגליים

תמונה להעלאה: `תמונות תרגילים 1/leg-press.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the sled lowered and the knees at about 90 degrees. Press the platform away until the legs are nearly straight, then lower it back to about 90 degrees.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Back and hips stay on the pad, feet stay flat on the platform, hands stay on the handles, and the machine frame stays rigid. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds pressing and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 16. leg-curl — מכפוף רגל

תמונה להעלאה: `תמונות תרגילים 1/leg-curl.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, lying face-down with the knees curled. Lower the roller pad until the legs are nearly straight, then curl it back up toward the glutes.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Hips stay pressed into the pad, the torso and arms stay still, and the machine stays rigid. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds curling. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 17. calf-raise — הרמות עקב

תמונה להעלאה: `תמונות תרגילים 1/calf-raise.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, up on the balls of both feet. Lower the heels slowly to flat, then rise back onto the balls of the feet.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The body stays straight and tall, the knees stay straight, one hand rests lightly on the vertical post, and the post does not move. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds rising. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 18. lunges — לאנג'ים

תמונה להעלאה: `תמונות תרגילים 1/lunges.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position at the bottom of a forward lunge. Push through the front heel to stand with the feet together, then step forward again with the same leg and lower back into the lunge.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The torso stays upright, the front knee stays at about 90 degrees over the ankle, the back knee lowers to just above the floor, and the same leg steps forward each time. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds stepping and lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 19. leg-extension — יישור רגל

תמונה להעלאה: `תמונות תרגילים 1/leg-extension.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the legs extended and the pad raised. Lower the roller pad until the knees bend to about 90 degrees, then extend the knees back to full extension.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The back stays against the pad, hands stay on the handles, and the machine stays rigid. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds extending. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 20. plank — פלאנק

תמונה להעלאה: `תמונות תרגילים 1/plank.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated forearm plank and hold it steadily: one straight line from head to heels, core and glutes braced, neck neutral.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Forearms and toes stay planted, hips stay level, and the body shows only very slight natural settling. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: A steady six-second hold with minimal movement. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 21. crunches — כפיפות בטן

תמונה להעלאה: `תמונות תרגילים 1/crunches.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the upper back curled off the mat. Lower the shoulders back to the mat under control, then curl the upper back up again.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The lower back stays on the mat, feet stay flat, and the hands stay lightly at the temples without pulling the head. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds curling up. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 22. leg-raise — הרמת רגליים

תמונה להעלאה: `תמונות תרגילים 1/leg-raise.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with both straight legs raised. Lower the legs until the heels are just above the mat, then raise them back to the same angle.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The lower back stays pressed into the mat, hands stay flat beside the hips, and the legs stay together and straight. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds raising. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 23. deadlift — דדליפט

תמונה להעלאה: `תמונות תרגילים 1/deadlift.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: hips hinged, knees bent, back flat, arms straight, and the loaded bar at knee height. Stand up to a full lockout with the hips and knees extended and the bar at the upper thighs, then lower the bar along the thighs back to knee height.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The back stays flat and neutral, arms stay straight, the bar stays level, and the feet stay planted. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lifting and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 24. db-bench-press — לחיצת חזה שטוח דמבלים

תמונה להעלאה: `תמונות תרגילים 1/db-bench-press.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the dumbbells lowered beside the chest. Press both dumbbells up over the chest to near lockout, then lower them back beside the chest.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Back and head stay on the bench, feet stay planted, and the wrists stay aligned with the forearms. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds pressing and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 25. push-ups — שכיבות סמיכה

תמונה להעלאה: `תמונות תרגילים 1/push-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position at the top of the push-up with straight arms. Lower the body until the chest is close to the floor, then press back up to straight arms.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The body stays one rigid straight line from head to heels, and the hands stay flat on the floor. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pressing up. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 26. decline-push-ups — שכיבות סמיכה רגליים מוגבהות

תמונה להעלאה: `תמונות תרגילים 1/decline-push-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the feet on the step and the arms straight. Lower the chest until it nears the floor, then press back up to straight arms.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The feet stay on the step, the body stays one rigid straight line angled down toward the hands, and the hands stay flat. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pressing up. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 27. wide-push-ups — שכיבות סמיכה רחבות

תמונה להעלאה: `תמונות תרגילים 1/wide-push-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with wide hands and straight arms. Lower the chest until it nears the floor with the elbows flaring out, then press back up to straight arms.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The body stays straight from head to heels, and the wide hand placement stays unchanged and flat on the floor. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pressing up. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 28. inverted-row — חתירה הפוכה

תמונה להעלאה: `תמונות תרגילים 1/inverted-row.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the chest pulled up to the low bar. Lower the body until the arms are straight, then pull the chest back up to the bar.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The heels stay on the floor, the body stays one straight rigid line from head to heels, both hands stay on the bar, and the bar stays fixed in the same place in the air, perfectly still and straight. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds pulling. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 29. superman-row — סופרמן חתירה

תמונה להעלאה: `תמונות תרגילים 1/superman-row.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated prone position with the chest and legs lifted and the elbows pulled back. Reach both arms straight forward ahead of the head, then pull the elbows back past the ribs in a rowing motion.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The chest and legs stay lifted off the mat and the neck stays neutral. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds reaching forward and three seconds rowing back. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 30. superman-pulls — סופרמן

תמונה להעלאה: `תמונות תרגילים 1/superman-pulls.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated prone superman hold with the arms pulled back. Extend both arms straight forward ahead of the head, then pull them back toward the shoulders with the elbows bending.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The chest and legs stay lifted off the mat and the neck stays neutral. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds extending forward and three seconds pulling back. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 31. superman-raises — סופרמן הרמות

תמונה להעלאה: `תמונות תרגילים 1/superman-raises.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated superman hold with the arms and legs lifted. Lower the arms, chest and legs gently toward the mat, then lift them all back up together into the hold.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The arms stay straight forward, the legs stay straight back, and the neck stays neutral. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds lifting. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 32. pike-push-ups — שכיבות סמיכה פייק

תמונה להעלאה: `תמונות תרגילים 1/pike-push-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated pike position with the head lowered between the hands. Press back up to straight arms, then lower the head toward the floor again between the hands.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The hips stay raised at the same height, the legs stay straight, and the hands and feet stay planted. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds pressing up and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 33. lateral-raise-bottles — הרמה צדדית עם בקבוקים

תמונה להעלאה: `תמונות תרגילים 1/lateral-raise-bottles.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with both arms raised to shoulder height holding plain water bottles. Lower the bottles slowly to the sides of the thighs, then raise them back out to shoulder height.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The torso stays upright and still, the slight elbow bend stays constant, and the bottles keep their shape and stay unlabeled. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds raising. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 34. bicep-curl-bottles — כפיפת מרפק עם בקבוקים

תמונה להעלאה: `תמונות תרגילים 1/bicep-curl-bottles.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: one arm curled with its water bottle at shoulder height, the other arm hanging straight with its bottle beside the thigh. Alternate the arms: the curled bottle lowers slowly to the thigh while, at the same time, the hanging bottle curls up to shoulder height with the palm facing up; then reverse back to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Only the forearms move, hinging at the elbows; the elbows stay pinned to the sides, and the torso, head and legs stay still. Each bottle stays a rigid, unlabeled object held firmly in the fist and never spins, flips or rotates in the hand. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete alternation over six seconds: two smooth arm swaps of about three seconds each, ending in the starting arm positions. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 35. hammer-curl-bottles — כפיפה עם בקבוקים

תמונה להעלאה: `תמונות תרגילים 1/hammer-curl-bottles.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: one arm curled with its water bottle held upright at shoulder height in a neutral grip, the other arm hanging straight with its bottle beside the thigh. Alternate the arms with the palms facing each other the whole time: the curled bottle lowers slowly to the thigh while, at the same time, the hanging bottle curls up to shoulder height; then reverse back to the starting position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Only the forearms move, hinging at the elbows; the elbows stay pinned to the sides, and the torso, head and legs stay still. Each bottle stays a rigid, unlabeled object held firmly in the fist and never spins, flips or rotates in the hand. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete alternation over six seconds: two smooth arm swaps of about three seconds each, ending in the starting arm positions. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 36. diamond-push-ups — שכיבות סמיכה יהלום

תמונה להעלאה: `תמונות תרגילים 1/diamond-push-ups.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the hands together in a diamond under the chest and the chest lowered. Press up to straight arms, then lower back down with the elbows tucked close to the ribs.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The index fingers and thumbs stay touching in the diamond shape, and the body stays straight from head to heels. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds pressing up and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 37. bulgarian-split-squat — סקוואט בולגרי

תמונה להעלאה: `תמונות תרגילים 1/bulgarian-split-squat.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated lowered position with the back foot on the bench. Drive through the front heel up to standing tall with the front leg nearly straight, then lower back down until the front thigh is about parallel to the floor.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The back foot stays on the bench, the hands stay on the hips, the torso stays upright, and the front knee tracks over the toes. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 38. single-leg-deadlift — דדליפט על רגל אחת

תמונה להעלאה: `תמונות תרגילים 1/single-leg-deadlift.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position, hinged forward on one leg with a dumbbell in each hand and the other leg extended straight back. Return to standing tall as the free leg comes down beside the standing leg, then hinge forward again with the free leg rising straight back.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The hips stay square, the back stays flat, the standing knee keeps a soft bend, the dumbbells stay close to the legs, and balance is held throughout. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising upright and three seconds hinging forward. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 39. jump-squat — סקוואט קפיצה

תמונה להעלאה: `תמונות תרגילים 1/jump-squat.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated pose: a half squat with both arms extended straight out at shoulder height. Perform one jump: explode straight up until the legs are fully extended and both feet leave the floor, then land softly on both feet and absorb back into the same half squat.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The arms stay extended at shoulder height throughout, the knees track over the toes, and the jump rises and falls straight up and down in place with natural gravity timing. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete jump cycle within six seconds: a quick takeoff, a brief airborne moment, a soft landing and a settle back into the starting pose. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 40. glute-bridge — גשר ירכיים

תמונה להעלאה: `תמונות תרגילים 1/glute-bridge.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position with the hips raised in the bridge. Lower the hips until they lightly touch the mat, then lift them back up to a straight line from shoulders to knees.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Feet stay flat, arms stay flat on the mat, and the upper back stays down. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds lowering and three seconds lifting. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 41. sissy-squat — סיסי סקוואט

תמונה להעלאה: `תמונות תרגילים 1/sissy-squat.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated lowered position: up on the balls of the feet, knees bent and pushed forward, both hands holding the vertical pole at chest height. Rise up to standing tall, then lower back down by pushing the knees forward into the same position.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. Both hands stay on the pole, the heels stay raised off the floor, the pole stays fixed and does not move, and the movement stays slow and controlled. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 42. walking-lunges — לאנג'ים בהליכה

תמונה להעלאה: `תמונות תרגילים 1/walking-lunges.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed side view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated mid-stride lunge. Rise and step forward with the back leg into the next lunge, then again with the other leg into the starting lunge.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The camera is locked and the figure lunges in place without travelling across the frame, the torso stays upright, the front knee stays at about 90 degrees, and the back knee lowers to just above the floor. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: Two continuous steps over six seconds, about three seconds each, ending in the starting lunge. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

## 43. single-leg-calf-raise — הרמות עקב על מדרגה

תמונה להעלאה: `תמונות תרגילים 1/single-leg-calf-raise.png`

```
Animate the uploaded illustration into a seamless looping 2D flat vector exercise demonstration.

VISUAL CONSISTENCY: Use the uploaded image as the exact visual reference. Preserve the character's identity, body proportions, facial features, expression, clothing, colors, flat vector shading, smooth outlines, equipment design, white background, and floor line throughout. Keep the same 2D artwork style in every frame, rendered in high resolution with crisp, sharp, clean outlines and fine detail, and no blur, noise or compression artifacts. Identical environment in every video: a plain white background with one flat, solid mid-grey floor band across the bottom of the frame, and nothing else in the scene except the exercise equipment. Identical character in every video: the same athletic man with short charcoal-black hair, warm tanned skin, a light warm-grey sleeveless tank top, dark charcoal shorts and dark blue-grey sneakers with white soles.

CAMERA: Fixed three-quarter front view, identical to the uploaded image. Locked-off camera, constant framing and scale, stationary background, one continuous shot. The whole figure, including head, hands, feet and all equipment, stays fully inside the frame at all times with white margin on every side.

EXERCISE: Begin in the illustrated position: standing on one foot on the step, the other knee lifted in front of the body, hands on the hips. Rise up high onto the ball of the standing foot, then lower the heel slowly back down onto the step.

ANIMATION: Smooth, controlled, anatomically plausible joint movement. The other knee stays lifted, the hands stay on the hips, and the body stays straight and tall. Consistent limb lengths, natural joint connections, original hand shapes, and continuous contact with equipment. Equipment keeps its original rigid geometry. Only the body parts and equipment involved in the exercise move. The full range of motion is large and clearly visible.

TIMING AND LOOP: One complete repetition over six seconds: about three seconds rising and three seconds lowering. Smooth reversals, and a final pose matching the uploaded starting pose for continuous looping.

AUDIO: Silent soundtrack.
```

