package com.lastmile.user.grpc;

import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@GrpcGlobalServerInterceptor
@Component
public class AuthInterceptor implements ServerInterceptor {

    // Reusable context keys; MUST be static to ensure same identity for put/get.
    public static final Context.Key<String> USER_ID_KEY = Context.key("userId");
    public static final Context.Key<String> AUTH_TOKEN_KEY = Context.key("authToken");

    // private static final Logger log = LoggerFactory.getLogger(AuthInterceptor.class);

    private static final Metadata.Key<String> AUTH_KEY = Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);

    private static final Set<String> WHITELIST = Set.of(
            "com.lastmile.user.proto.UserService/RegisterUser",
            "com.lastmile.user.proto.UserService/LoginUser"
    );

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    private boolean requiresAuth(String fullMethodName) {
        return !WHITELIST.contains(fullMethodName);
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(ServerCall<ReqT, RespT> call,
                                                                Metadata headers,
                                                                ServerCallHandler<ReqT, RespT> next) {
        String methodName = call.getMethodDescriptor().getFullMethodName();
        if (!requiresAuth(methodName)) {
            return next.startCall(call, headers);
        }
        String authHeader = headers.get(AUTH_KEY);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            call.close(Status.UNAUTHENTICATED.withDescription("Missing Bearer token"), new Metadata());
            return new ServerCall.Listener<ReqT>() {};
        }
        String token = authHeader.substring(7).trim();
        String userId = redisTemplate.opsForValue().get("token:" + token);
        if (userId == null) {
            call.close(Status.UNAUTHENTICATED.withDescription("Invalid or expired token"), new Metadata());
            return new ServerCall.Listener<ReqT>() {};
        }
        Context ctx = Context.current()
            .withValue(USER_ID_KEY, userId)
            .withValue(AUTH_TOKEN_KEY, token);
        return Contexts.interceptCall(ctx, call, headers, next);
    }
}
