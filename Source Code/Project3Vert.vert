#version 330 compatibility

//out vec4 vColor; 
out float vX, vY;
uniform float uK;
uniform float uP;
uniform sampler3D Noise3;
uniform sampler2D textureK;
uniform float uNoiseFreq;
uniform float uNoiseAmp;

float PI = 3.1415926;
float Y0 = 1.;

uniform float uLightX, uLightY, uLightZ;

flat out vec3 vNf;
out vec3 vNs;

out vec3 vs_position;

vec3 eyeLightPosition = vec3(uLightX, uLightY, uLightZ);

const vec3 LIGHTPOS   = vec3( -2., 0., 10. );

varying vec2 texCoord;

out VS_OUT {
    vec3 TangentLightPos;
    vec3 TangentViewPos;
    vec3 TangentFragPos;
} vs_out;


vec3
RotateNormal( float angx, float angy, vec3 n )
{
        float cx = cos( angx );
        float sx = sin( angx );
        float cy = cos( angy );
        float sy = sin( angy );

        // rotate about x:
        float yp =  n.y*cx - n.z*sx;    // y'
        n.z      =  n.y*sx + n.z*cx;    // z'
        n.y      =  yp;
        // n.x      =  n.x;

        // rotate about y:
        float xp =  n.x*cy + n.z*sy;    // x'
        n.z      = -n.x*sy + n.z*cy;    // z'
        n.x      =  xp;
        // n.y      =  n.y;

        return normalize( n );
}

void
main( )
{	
	vX = gl_Vertex.x;
	vY = gl_Vertex.y;

	float z =  uK*(Y0 -vY) * sin(2. * PI * vX/uP);
	//vec4 Vertex = vec4(gl_Vertex.xy, z, 1.);
	vec4 Vertex = gl_Vertex;
	vs_position = (gl_ModelViewMatrix * Vertex).xyz;

	float dzdx = uK*(Y0 -vY) * (2.*PI/uP) * cos(2. * PI * vX/uP);
	float dzdy = -uK*sin(2.*PI*vX/uP);
	vec3 Tx = vec3 (1., 0., dzdx);
	vec3 Ty = vec3 (0., 1., dzdy);
	vec3 vNormal = cross(Tx,Ty);

	vec4 nvx = texture( Noise3, uNoiseFreq*Vertex.xyz);
	float angx = nvx.r + nvx.g + nvx.b + nvx.a  -  2.;
	angx *= uNoiseAmp;

    vec4 nvy = texture( Noise3, uNoiseFreq*vec3(Vertex.xy,Vertex.z+0.5) );
	float angy = nvy.r + nvy.g + nvy.b + nvy.a  -  2.;
	angy *= uNoiseAmp;

	texCoord = gl_MultiTexCoord0.xy;

	//vNormal = RotateNormal(angx,angy,vNormal);
	//vNf = normalize( gl_NormalMatrix * vNormal );
    //vNf =normalize(gl_NormalMatrix*gl_Normal);
	//=========================================================================

	vNf = vec3(0,0,0);
	vNs = vNf;

	vec3 ECposition = vec3( gl_ModelViewMatrix * Vertex );

	//vColor = gl_Color.rgba; 
	//vS = gl_MultiTexCoord0.s;
	//vT = gl_MultiTexCoord0.t;
	
//==============================Tangent matrix===================================//
	vec3 aNormal = gl_NormalMatrix * gl_Normal;
	vec3 y = vec3 (0.,1.,0.);
	//vec3 aBitangent = normalize(cross(y,aNormal));
	//vec3 aTangent = normalize(cross(aNormal,aBitangent));
	float d = dot( y, aNormal );
	vec3 aBitangent = normalize( y - d*aNormal );
	vec3 aTangent = normalize( cross(y,aNormal) );
	
	vec3 T   = normalize(aTangent);
    vec3 B   = normalize(aBitangent);
    vec3 N   = normalize(-aNormal);
    mat3 TBN = transpose(mat3(T, B, N));

	vs_out.TangentLightPos = TBN * eyeLightPosition;
    vs_out.TangentViewPos  = TBN * vec3(0., 0., 3.);
    vs_out.TangentFragPos  = TBN * ECposition;
//===============================================================================//

	gl_Position = gl_ModelViewProjectionMatrix * Vertex;
}