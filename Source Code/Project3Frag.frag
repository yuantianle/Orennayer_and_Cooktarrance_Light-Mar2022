#version 330 compatibility

uniform float uAd; 
uniform float uBd;
uniform float uTol;

uniform float uAlpha; 

in float vX, vY; 
in vec3 vs_position;
//in float vS, vT;
uniform sampler2D textureK;

uniform float uKa, uKd, uKs;
uniform vec4 uColor;
uniform vec4 uSpecularColor;
uniform float uShininess;
uniform bool uFlat;

flat in vec3 vNf;
in vec3 vNs;
flat in vec3 vLf;
in vec3 vLs;
flat in vec3 vEf;
in vec3 vEs;
uniform float uNoiseAmp;

uniform float uLightX, uLightY, uLightZ;
vec3 eyeLightPosition = vec3(uLightX, uLightY, uLightZ);

uniform float uRoughness_D;
uniform float uRoughness_S;
varying vec2 texCoord;


float orenNayar(vec3 N, vec3 L, vec3 V, float NdotL, float NdotV, float Roughness)
{
    float PI = 3.141592;
    float theta_r = acos(NdotV);
    float theta_i = acos(NdotL);

    float alpha = max(theta_r, theta_i);
    float beta = min(theta_r, theta_i);

    float r2 = Roughness * Roughness;


    float A = 1.0 - 0.5*(r2/(r2+0.33));
    float B = 0.45*(r2/(r2+0.09));
    float C = sin(alpha) * tan(beta);
    
    float gamma = clamp(dot(normalize(V - N * NdotV), normalize(L - N * NdotL)),0,1); 
    
    return NdotL * (A + (B  * C * max(0.0, gamma)));


    //float gamma = dot(V - N * NdotV, L - N * NdotL); 
    //float C1 = 1.0 - 0.5*(r2/(r2+0.33));
    //float C2 = 0.45*(r2/(r2+0.09));
    //if (gamma >= 0) C2 = C2*sin(alpha);
    //else  C2 = C2*sin(alpha - pow((2.0*beta/PI),3));
    //float C3 = 0.125*(r2/(r2+0.09))*pow(((4.0*alpha*beta)/(PI*PI)),2);
    //float twoBetaPi = 2.0 * beta/PI; 
    //float L2 = 0.17 * (r2/(r2 + 0.13)) * (1.0 - gamma * twoBetaPi * twoBetaPi);
    //return NdotL*(C1 + gamma*C2*tan(beta)) + (1.0-abs(gamma))*C3*tan(0.5*(alpha+beta) + L2);
}

float CookTorrance(float NdotL, float NdotV, float NdotH, float VdotH, float Roughness)
{
	Roughness *= 3.0f;
	// compute the geometric term
	float G1 = (2.0f * NdotH * NdotV) / VdotH;
	float G2 = (2.0f * NdotH * NdotL) / VdotH;
	float G = min(1.0f, max(0.0f, min(G1,G2)));

	// we set fresnel term == 1
	float F = 1.0; //Roughness2 + (1.0F - Roughness2) * Pow(1.0f - NdotV, 5.0f);

	// compute the roughness term
	float R_2 = Roughness * Roughness;
	float NDotH_2 = NdotH * NdotH;
	float A = 1.0f / (4.0f * R_2 * NDotH_2 * NDotH_2);
	float B = exp(-(1.0f - NDotH_2)/(R_2 * NDotH_2));
	float R = A * B;

	return ((G*F*R)/(NdotL*NdotV));
}

float Transparency(float tao, float NdotL, float NdotV)
{
	return exp(-1.0*tao*(1.0/NdotV+1.0/NdotL));
}

float Daust_coefficient(float g, float NdotL, float NdotV)
{
	float g2 = g*g;
	float theta_r = acos(NdotV);
    float theta_i = acos(NdotL);
	return ((1-g2)/pow((1+g2-2*g*cos(theta_r+theta_i)),1.5)) * (NdotL/(NdotL+ NdotV));
}


void 
main( ) 
{
	vec3 Normal;
	vec3 Light;
	vec3 Eye;

	//vec4 terrian = texture(textureK, texCoord);
	//vec3 normal;
    //const vec2 size = vec2(2.0,0.0);
    //const ivec3 off = ivec3(-1,0,1); 
    //vec4 wave = texture(textureK, texCoord);
    //float s11 = wave.x;
    //float s01 = textureOffset(textureK, texCoord, off.xy).x;
    //float s21 = textureOffset(textureK, texCoord, off.zy).x;
    //float s10 = textureOffset(textureK, texCoord, off.yx).x;
    //float s12 = textureOffset(textureK, texCoord, off.yz).x;
    //float mult = uNoiseAmp;//uCrackDepth;  // the depth 2.3
    //vec3 va = normalize(vec3(size.xy,mult*(s21-s01)));
    //vec3 vb = normalize(vec3(size.yx,mult*(s12-s10)));
    //normal = cross(va,vb);

	if(uFlat)
	{
		Normal = normalize(vNf);//normalize(normal);
		Light = normalize(vLf);
		Eye = normalize(vEf);
	}
	else
	{
		Normal = normalize(vNs);//normalize(normal);
		Light = normalize(vLs);
		Eye = normalize(vEs);
	}
	vec4 ambient = uKa*uColor;
	
	//float d = max(dot(Normal,Light), 0.);

	vec3 VertextoLight = normalize(eyeLightPosition - vs_position);
    vec3 VertextoEye = normalize(vec3(0,0,0) - vs_position);
    float NdotL = clamp(dot(Normal, VertextoLight), 0.0, 1.0);//max(dot(normal, VertextoLight),0.);
    float NdotV = clamp(dot(Normal, VertextoEye), 0.0, 1.0);//max(dot(normal, VertextoEye),0.);
    float d = orenNayar(Normal, VertextoLight, VertextoEye, NdotL, NdotV, uRoughness_D);
	vec4 diffuse = uKd*d*uColor;

	//float s = 0.;
	//if(dot(Normal,Light) > 0.)
	//{
	//	vec3 ref = normalize(2. * Normal * dot(Normal,Light) - Light);
	//	s = pow(max(dot(Eye,ref), 0.), uShininess);
	//}
	
	vec3 H = normalize(VertextoLight + VertextoEye);
	float NdotH = dot(Normal,H);
	float VdotH = dot(VertextoEye,H);
	float NdotL2 = dot(Normal, VertextoLight);//max(dot(normal, VertextoLight),0.);
    float NdotV2 = dot(Normal, VertextoEye);//max(dot(normal, VertextoEye),0.);
	float s = CookTorrance(NdotL2, NdotV2, NdotH, VdotH, uRoughness_S);
	vec4 specular = uKs*s*uSpecularColor;


	vec4 dust_color = vec4(0.7, 0.6, 0.6, 1.0);
	float g = 0.109400;
	vec4 dust = dust_color * Daust_coefficient(g, NdotL, NdotV);

	float T = Transparency(uKa, NdotL, NdotV); //uKa here is the tao
	float lambda = 10.0/3.0;
	gl_FragColor = vec4( (1-T)*dust.rgb + T*diffuse.rgb + exp(-lambda*uKa)*specular.rgb, 1.0);//ambient +
//--------------------------------------------------------------------------------------------------	
	

	//vec2 vST = vec2(vS,vT);
	//vec4 nv  = texture2D( Noise2, uNoiseFreq* vST );
	//float n = nv.r + nv.g + nv.b + nv.a;    //  1. -> 3.
	//n = n - 2.;                             // -1. -> 1.
	//n *= uNoiseAmp;
	//
	//
	//float Ar = uAd/2.; 
	//float Br = uBd/2.; 
	//int numins = int( vS / uAd ); 
	//int numint = int( vT / uBd ); 
	//float sc = numins *uAd + Ar;
	//float tc = numint *uBd + Br;
	//float ds = vS -sc;
	//float dt = vT -tc;
	//float oldDist = sqrt( ds*ds + dt*dt );
	//float newDist = oldDist + n;
	//float scale = newDist/oldDist;
	//ds *= scale;
	//dt *= scale;
	//
	//float d = (ds)*(ds)/(Ar*Ar) + (dt)*(dt)/(Br*Br); 
	////float dfrac = fract(d);
	//
	////float t = smoothstep( 0.5-uP-uTol, 0.5-uP+uTol, rfrac ) - smoothstep( 0.5+uP-uTol, 0.5+uP+uTol, rfrac );
	//float t = smoothstep( 1.-uTol, 1.+uTol, d );
	//
	//vec3 m = mix( WHITE, vColor, t ); 
	//if (m == vec3(1,1,1)) 
	//	if (uAlpha == 0)
	//		discard;
	//	else gl_FragColor = vec4(vLightIntensity * m ,uAlpha);
	//else gl_FragColor = vec4(vLightIntensity * m ,1);

}
