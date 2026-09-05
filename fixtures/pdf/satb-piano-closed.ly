\version "2.24.0"
\header {
  title = "Closed-score SATB + piano spike"
  composer = "Harmony MVP"
  tagline = ##f
}
\paper {
  indent = 18
  ragged-right = ##f
}
global = {
  \key c \major
  \time 4/4
  \tempo 4 = 90
}

soprano = \relative c'' {
  \voiceOne
  g1 ~ | g2 a | b4 c d2 | c1
}
alto = \relative c' {
  \voiceTwo
  e1 | r4 f2. | g1 | e1
}
tenor = \relative c' {
  \voiceOne
  c1 | c1 | d1 | c1
}
bass = \relative c {
  \voiceTwo
  c1 | f1 | g1 | c,1
}
pianoRH = \relative c' {
  <e g c>1 | <f a c>1 | <g b d>1 | <e g c>1
}
pianoLH = \relative c, {
  <c c'>1 | <f f'>1 | <g g'>1 | <c, c'>1
}

\score {
  <<
    \new ChoirStaff <<
      \new Staff \with { instrumentName = "S A" } <<
        \clef treble
        \global
        \new Voice = "soprano" \soprano
        \new Voice = "alto" \alto
      >>
      \new Staff \with { instrumentName = "T B" } <<
        \clef bass
        \global
        \new Voice = "tenor" \tenor
        \new Voice = "bass" \bass
      >>
    >>
    \new PianoStaff \with { instrumentName = "Piano" } <<
      \new Staff << \clef treble \global \pianoRH >>
      \new Staff << \clef bass \global \pianoLH >>
    >>
  >>
  \layout { }
}
