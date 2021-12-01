import * as React from "react"
import Svg, { G, Rect, Path, Circle, Ellipse } from "react-native-svg"

const SvgComponent = (props) => {
  const strokeColor = props.color
  return (
    <Svg
      xmlns='http://www.w3.org/2000/svg'
      width={40}
      height={40}
      viewBox='0 0 212 171'
      {...props}>
      <G id='Group_4' data-name='Group 4' transform='translate(-217 -275)'>
        <G
          id='Group_2'
          data-name='Group 2'
          transform='translate(344.2 275)'
          opacity={0.86}>
          <G
            id='Rectangle_1'
            data-name='Rectangle 1'
            transform='translate(-0.2 38)'
            fill='rgba(0,0,0,0)'
            stroke={strokeColor}
            strokeWidth={10}>
            <Rect width={85} height={94} rx={15} stroke='none' />
            <Rect x={5} y={5} width={75} height={84} rx={10} fill='none' />
          </G>
          <G
            id='Rectangle_2'
            data-name='Rectangle 2'
            transform='translate(22.8)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={11}>
            <Path
              d='M9,0H28a9,9,0,0,1,9,9V44a0,0,0,0,1,0,0H0a0,0,0,0,1,0,0V9A9,9,0,0,1,9,0Z'
              stroke='none'
            />
            <Path
              d='M9,4H28a5,5,0,0,1,5,5V36a4,4,0,0,1-4,4H8a4,4,0,0,1-4-4V9A5,5,0,0,1,9,4Z'
              fill='none'
            />
          </G>
          <Circle
            id='Ellipse_1'
            data-name='Ellipse 1'
            cx={5.5}
            cy={5.5}
            r={5.5}
            transform='translate(36.8 12)'
            fill='#060606'
          />
          <G
            id='Ellipse_2'
            data-name='Ellipse 2'
            transform='translate(40.8 16)'
            fill='#fff'
            stroke={strokeColor}
            strokeWidth={1}>
            <Ellipse cx={1.5} cy={1} rx={1.5} ry={1} stroke='none' />
            <Ellipse cx={1.5} cy={1} rx={1} ry={0.5} fill='none' />
          </G>
          <Path
            id='Path_3'
            data-name='Path 3'
            d='M677.947,214.794c1.1,80.545-30.608,79.988-30.608,79.988'
            transform='translate(-634.207 -170.342)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={2}
          />
        </G>
        <G id='Group_1' data-name='Group 1' transform='translate(281.284 313.981)'>
          <G
            id='Rectangle_1-2'
            data-name='Rectangle 1'
            transform='translate(-0.284 38.019)'
            fill='rgba(0,0,0,0)'
            stroke={strokeColor}
            strokeWidth={10}>
            <Rect width={85} height={94} rx={15} stroke='none' />
            <Rect x={5} y={5} width={75} height={84} rx={10} fill='none' />
          </G>
          <G
            id='Rectangle_2-2'
            data-name='Rectangle 2'
            transform='translate(23.716 0.019)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={11}>
            <Path
              d='M9,0H27a9,9,0,0,1,9,9V44a0,0,0,0,1,0,0H0a0,0,0,0,1,0,0V9A9,9,0,0,1,9,0Z'
              stroke='none'
            />
            <Path
              d='M9,4H27a5,5,0,0,1,5,5V36a4,4,0,0,1-4,4H8a4,4,0,0,1-4-4V9A5,5,0,0,1,9,4Z'
              fill='none'
            />
          </G>
          <Circle
            id='Ellipse_1-2'
            data-name='Ellipse 1'
            cx={5.5}
            cy={5.5}
            r={5.5}
            transform='translate(36.716 12.019)'
            fill='#060606'
          />
          <G
            id='Ellipse_2-2'
            data-name='Ellipse 2'
            transform='translate(40.716 16.019)'
            fill='#fff'
            stroke={strokeColor}
            strokeWidth={1}>
            <Ellipse cx={1.5} cy={1} rx={1.5} ry={1} stroke='none' />
            <Ellipse cx={1.5} cy={1} rx={1} ry={0.5} fill='none' />
          </G>
          <Path
            id='Path_3-2'
            data-name='Path 3'
            d='M677.947,214.794c1.1,80.545-30.608,79.988-30.608,79.988'
            transform='translate(-634.207 -170.342)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={2}
          />
        </G>
        <G id='Group_3' data-name='Group 3' transform='translate(217 275)' opacity={0.82}>
          <G
            id='Rectangle_1-3'
            data-name='Rectangle 1'
            transform='translate(0 38)'
            fill='rgba(0,0,0,0)'
            stroke={strokeColor}
            strokeWidth={10}>
            <Rect width={85} height={94} rx={15} stroke='none' />
            <Rect x={5} y={5} width={75} height={84} rx={10} fill='none' />
          </G>
          <G
            id='Rectangle_2-3'
            data-name='Rectangle 2'
            transform='translate(23)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={11}>
            <Path
              d='M9,0H28a9,9,0,0,1,9,9V44a0,0,0,0,1,0,0H0a0,0,0,0,1,0,0V9A9,9,0,0,1,9,0Z'
              stroke='none'
            />
            <Path
              d='M9,4H28a5,5,0,0,1,5,5V36a4,4,0,0,1-4,4H8a4,4,0,0,1-4-4V9A5,5,0,0,1,9,4Z'
              fill='none'
            />
          </G>
          <Circle
            id='Ellipse_1-3'
            data-name='Ellipse 1'
            cx={5.5}
            cy={5.5}
            r={5.5}
            transform='translate(37 12)'
            fill='#060606'
          />
          <G
            id='Ellipse_2-3'
            data-name='Ellipse 2'
            transform='translate(41 16)'
            fill='#fff'
            stroke={strokeColor}
            strokeWidth={1}>
            <Ellipse cx={1.5} cy={1} rx={1.5} ry={1} stroke='none' />
            <Ellipse cx={1.5} cy={1} rx={1} ry={0.5} fill='none' />
          </G>
          <Path
            id='Path_3-3'
            data-name='Path 3'
            d='M677.947,214.794c1.1,80.545-30.608,79.988-30.608,79.988'
            transform='translate(-634.207 -170.342)'
            fill='none'
            stroke={strokeColor}
            strokeWidth={2}
          />
        </G>
      </G>
    </Svg>
  )
}

export default SvgComponent
